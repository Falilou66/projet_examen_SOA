<?php

namespace Controllers;

use Core\DB;
use Core\Request;
use Core\Response;

class IncidentController
{
    private string $surveillanceUrl;

    public function __construct()
    {
        $this->surveillanceUrl = getenv('SURVEILLANCE_URL') ?: 'http://surveillance:8001';
    }

    public function health(Request $req, array $params): void
    {
        Response::success([
            'status'    => 'disponible',
            'service'   => 'incidents',
            'version'   => '1.0.0',
            'timestamp' => date('c'),
        ]);
    }

    public function index(Request $req, array $params): void
    {
        $conditions = [];
        $bindings   = [];

        if (!empty($req->query['statut'])) {
            $conditions[] = 'statut = ?';
            $bindings[]   = $req->query['statut'];
        }
        if (!empty($req->query['quartier'])) {
            $conditions[] = 'quartier = ?';
            $bindings[]   = $req->query['quartier'];
        }
        if (!empty($req->query['severite'])) {
            $conditions[] = 'severite = ?';
            $bindings[]   = $req->query['severite'];
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $stmt  = DB::get()->prepare(
            "SELECT * FROM incidents $where ORDER BY cree_le DESC LIMIT 100"
        );
        $stmt->execute($bindings);

        Response::success($stmt->fetchAll());
    }

    public function show(Request $req, array $params): void
    {
        $stmt = DB::get()->prepare("SELECT * FROM incidents WHERE id = ?");
        $stmt->execute([$params['id']]);
        $incident = $stmt->fetch();

        if (!$incident) {
            Response::error('Incident non trouvé', 404);
        }
        Response::success($incident);
    }

    public function resoudre(Request $req, array $params): void
    {
        $stmt = DB::get()->prepare(
            "UPDATE incidents
             SET    statut = 'resolu', resolu_le = NOW()
             WHERE  id = ? AND statut = 'actif'
             RETURNING *"
        );
        $stmt->execute([$params['id']]);
        $incident = $stmt->fetch();

        if (!$incident) {
            Response::error('Incident non trouvé ou déjà résolu', 404);
        }
        Response::success($incident);
    }

    public function regles(Request $req, array $params): void
    {
        $stmt = DB::get()->query("SELECT * FROM regles ORDER BY type");
        Response::success($stmt->fetchAll());
    }

    public function updateRegle(Request $req, array $params): void
    {
        if (!isset($req->body['seuil_warning'], $req->body['seuil_critique'])) {
            Response::error('seuil_warning et seuil_critique sont requis', 422);
        }

        $stmt = DB::get()->prepare(
            "UPDATE regles
             SET    seuil_warning = ?, seuil_critique = ?
             WHERE  type = ?
             RETURNING *"
        );
        $stmt->execute([
            $req->body['seuil_warning'],
            $req->body['seuil_critique'],
            $params['type'],
        ]);
        $regle = $stmt->fetch();

        if (!$regle) {
            Response::error('Règle non trouvée', 404);
        }
        Response::success($regle);
    }

    // ── Composition de services : appelle le Service Surveillance ──
    public function verifier(Request $req, array $params): void
    {
        $url = $this->surveillanceUrl . '/mesures/dernieres';
        $ctx = stream_context_create([
            'http' => ['timeout' => 5, 'ignore_errors' => true],
        ]);
        $body = @file_get_contents($url, false, $ctx);

        if ($body === false) {
            Response::error('Service Surveillance inaccessible', 503);
        }

        $response = json_decode($body, true);
        $mesures  = $response['data'] ?? [];

        // Charger toutes les règles
        $rows   = DB::get()->query("SELECT * FROM regles")->fetchAll();
        $regles = [];
        foreach ($rows as $r) {
            $regles[$r['type']] = $r;
        }

        $db        = DB::get();
        $incidents = [];

        foreach ($mesures as $mesure) {
            $type = $mesure['type'];
            if (!isset($regles[$type])) {
                continue;
            }

            $regle    = $regles[$type];
            $valeur   = (float)$mesure['valeur'];
            $severite = null;

            if ($valeur > (float)$regle['seuil_critique']) {
                $severite = 'critique';
            } elseif ($valeur > (float)$regle['seuil_warning']) {
                $severite = 'warning';
            }

            if (!$severite) {
                continue;
            }

            // Ne pas créer de doublon si un incident actif existe déjà
            $check = $db->prepare(
                "SELECT id FROM incidents
                 WHERE  capteur_id = ? AND type = ? AND statut = 'actif'
                 LIMIT  1"
            );
            $check->execute([$mesure['capteur_id'], $type]);
            if ($check->fetch()) {
                continue;
            }

            $seuil   = $severite === 'critique'
                ? $regle['seuil_critique']
                : $regle['seuil_warning'];

            $message = sprintf(
                '%s %s détecté(e) à %s : %.1f %s (seuil: %.1f)',
                ucfirst($severite),
                $type,
                $mesure['quartier'],
                $valeur,
                $mesure['unite'] ?? '',
                $seuil
            );

            $insert = $db->prepare(
                "INSERT INTO incidents
                    (capteur_id, quartier, type, valeur_mesuree, seuil_depasse, severite, message)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 RETURNING *"
            );
            $insert->execute([
                $mesure['capteur_id'],
                $mesure['quartier'],
                $type,
                $valeur,
                $seuil,
                $severite,
                $message,
            ]);

            $incidents[] = $insert->fetch();
        }

        Response::success([
            'mesures_verifiees' => count($mesures),
            'incidents_crees'   => count($incidents),
            'incidents'         => $incidents,
        ]);
    }
}
