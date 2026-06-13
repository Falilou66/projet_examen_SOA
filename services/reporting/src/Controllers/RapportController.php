<?php

namespace Controllers;

use Core\Request;
use Core\Response;

class RapportController
{
    private string $surveillanceUrl;

    public function __construct()
    {
        $this->surveillanceUrl = getenv('SURVEILLANCE_URL') ?: 'http://surveillance:8001';
    }

    // ── Helpers ────────────────────────────────────────────────

    private function fetch(string $path): array
    {
        $ctx  = stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]);
        $body = @file_get_contents($this->surveillanceUrl . $path, false, $ctx);
        if (!$body) {
            return [];
        }
        $data = json_decode($body, true);
        return $data['data'] ?? [];
    }

    private function calcStats(array $mesures): array
    {
        $grouped = [];
        foreach ($mesures as $m) {
            $q = $m['quartier'];
            $t = $m['type'];
            if (!isset($grouped[$q][$t])) {
                $grouped[$q][$t] = ['valeurs' => [], 'unite' => $m['unite']];
            }
            $grouped[$q][$t]['valeurs'][] = (float)$m['valeur'];
        }

        $result = [];
        foreach ($grouped as $quartier => $types) {
            $row = ['nom' => $quartier];
            foreach ($types as $type => $d) {
                $v = $d['valeurs'];
                $row[$type] = [
                    'moyenne' => round(array_sum($v) / count($v), 1),
                    'min'     => min($v),
                    'max'     => max($v),
                    'unite'   => $d['unite'],
                    'mesures' => count($v),
                ];
            }
            $result[] = $row;
        }
        return $result;
    }

    // ── Endpoints ──────────────────────────────────────────────

    public function health(Request $req, array $params): void
    {
        Response::success([
            'status'    => 'disponible',
            'service'   => 'reporting',
            'version'   => '1.0.0',
            'timestamp' => date('c'),
        ]);
    }

    public function tempsReel(Request $req, array $params): void
    {
        $mesures = $this->fetch('/mesures/dernieres');

        if (empty($mesures)) {
            Response::error('Service Surveillance inaccessible ou aucune donnée', 503);
        }

        $quartiers = [];
        foreach ($mesures as $m) {
            $q = $m['quartier'];
            if (!isset($quartiers[$q])) {
                $quartiers[$q] = [];
            }
            $quartiers[$q][$m['type']] = [
                'valeur'    => (float)$m['valeur'],
                'unite'     => $m['unite'],
                'capteur'   => $m['capteur_id'],
                'timestamp' => $m['timestamp'],
            ];
        }

        Response::success([
            'timestamp' => date('c'),
            'quartiers' => $quartiers,
        ]);
    }

    public function statistiques(Request $req, array $params): void
    {
        $periode  = $req->query['periode'] ?? '24h';
        $quartier = $req->query['quartier'] ?? null;

        $periodeMap = ['1h' => '1 hour', '24h' => '24 hours', '7j' => '7 days', '30j' => '30 days'];
        $interval   = $periodeMap[$periode] ?? '24 hours';
        $depuis     = date('c', strtotime("-$interval"));

        $qs = 'limit=1000&depuis=' . urlencode($depuis);
        if ($quartier) {
            $qs .= '&quartier=' . urlencode($quartier);
        }

        $mesures = $this->fetch("/mesures?$qs");
        $stats   = $this->calcStats($mesures);

        Response::success(['periode' => $periode, 'quartiers' => $stats]);
    }

    public function historique(Request $req, array $params): void
    {
        $debut    = $req->query['debut']    ?? date('c', strtotime('-7 days'));
        $quartier = $req->query['quartier'] ?? '';
        $type     = $req->query['type']     ?? '';

        $qs = 'limit=500&depuis=' . urlencode($debut);
        if ($quartier) $qs .= '&quartier=' . urlencode($quartier);
        if ($type)     $qs .= '&type='     . urlencode($type);

        $mesures = $this->fetch("/mesures?$qs");

        Response::success(['mesures' => $mesures, 'total' => count($mesures)]);
    }

    public function tendances(Request $req, array $params): void
    {
        $now     = time();
        $depuis24h = date('c', $now - 86400);
        $depuis48h = date('c', $now - 172800);

        $m24h = $this->fetch('/mesures?limit=500&depuis=' . urlencode($depuis24h));
        $m48h = $this->fetch('/mesures?limit=500&depuis=' . urlencode($depuis48h));

        // Les mesures de "prev" sont celles entre -48h et -24h
        $mPrev = array_filter($m48h, function ($m) use ($depuis24h) {
            return $m['timestamp'] < $depuis24h;
        });

        $moy = function (array $mesures, string $type): ?float {
            $vals = array_map(
                fn($m) => (float)$m['valeur'],
                array_filter($mesures, fn($m) => $m['type'] === $type)
            );
            return $vals ? round(array_sum($vals) / count($vals), 1) : null;
        };

        $tendances = [];
        foreach (['temperature', 'humidite', 'aqi', 'bruit', 'eau'] as $t) {
            $actuel   = $moy($m24h, $t);
            $precedent = $moy($mPrev, $t);
            $tendances[$t] = [
                'derniere_24h'     => $actuel,
                'precedentes_24h'  => $precedent,
                'evolution'        => ($actuel !== null && $precedent !== null)
                    ? round($actuel - $precedent, 1)
                    : null,
            ];
        }

        Response::success($tendances);
    }

    public function export(Request $req, array $params): void
    {
        $periode = $req->query['periode'] ?? '7j';
        $quartier = $req->query['quartier'] ?? null;

        $periodeMap = ['1j' => '1 day', '7j' => '7 days', '30j' => '30 days'];
        $interval   = $periodeMap[$periode] ?? '7 days';
        $depuis     = date('c', strtotime("-$interval"));

        $qs = 'limit=1000&depuis=' . urlencode($depuis);
        if ($quartier) $qs .= '&quartier=' . urlencode($quartier);

        $mesures = $this->fetch("/mesures?$qs");

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="sencity-export-' . date('Y-m-d') . '.csv"');
        header('Access-Control-Allow-Origin: *');

        $out = fopen('php://output', 'w');
        fputcsv($out, ['id', 'capteur_id', 'quartier', 'type', 'valeur', 'unite', 'timestamp']);
        foreach ($mesures as $m) {
            fputcsv($out, [
                $m['id'],
                $m['capteur_id'],
                $m['quartier'],
                $m['type'],
                $m['valeur'],
                $m['unite'],
                $m['timestamp'],
            ]);
        }
        fclose($out);
        exit;
    }
}
