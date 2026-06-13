<?php

namespace Controllers;

use Core\DB;
use Core\Request;
use Core\Response;

class MesureController
{
    public function health(Request $req, array $params): void
    {
        Response::success([
            'status'    => 'disponible',
            'service'   => 'surveillance',
            'version'   => '1.0.0',
            'timestamp' => date('c'),
        ]);
    }

    public function store(Request $req, array $params): void
    {
        foreach (['capteur_id', 'quartier', 'type', 'valeur', 'unite'] as $f) {
            if (!isset($req->body[$f]) || $req->body[$f] === '') {
                Response::error("Champ requis manquant : $f", 422);
            }
        }

        $db = DB::get();

        // Enregistrer le capteur s'il n'existe pas encore
        $db->prepare(
            "INSERT INTO capteurs (capteur_id, quartier)
             VALUES (?, ?)
             ON CONFLICT (capteur_id) DO UPDATE SET quartier = EXCLUDED.quartier"
        )->execute([$req->body['capteur_id'], $req->body['quartier']]);

        $stmt = $db->prepare(
            "INSERT INTO mesures (capteur_id, quartier, type, valeur, unite)
             VALUES (?, ?, ?, ?, ?)
             RETURNING *"
        );
        $stmt->execute([
            $req->body['capteur_id'],
            $req->body['quartier'],
            $req->body['type'],
            $req->body['valeur'],
            $req->body['unite'],
        ]);

        Response::success($stmt->fetch(), 201);
    }

    public function index(Request $req, array $params): void
    {
        $conditions = [];
        $bindings   = [];

        if (!empty($req->query['quartier'])) {
            $conditions[] = 'quartier = ?';
            $bindings[]   = $req->query['quartier'];
        }
        if (!empty($req->query['type'])) {
            $conditions[] = 'type = ?';
            $bindings[]   = $req->query['type'];
        }
        if (!empty($req->query['depuis'])) {
            $conditions[] = 'timestamp >= ?';
            $bindings[]   = $req->query['depuis'];
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $limit = min((int)($req->query['limit'] ?? 100), 1000);

        $stmt = DB::get()->prepare(
            "SELECT * FROM mesures $where ORDER BY timestamp DESC LIMIT ?"
        );
        $bindings[] = $limit;
        $stmt->execute($bindings);

        Response::success($stmt->fetchAll());
    }

    public function show(Request $req, array $params): void
    {
        $stmt = DB::get()->prepare("SELECT * FROM mesures WHERE id = ?");
        $stmt->execute([$params['id']]);
        $mesure = $stmt->fetch();

        if (!$mesure) {
            Response::error('Mesure non trouvée', 404);
        }
        Response::success($mesure);
    }

    public function dernieres(Request $req, array $params): void
    {
        // Dernière mesure par capteur ET par type (toutes dates confondues)
        $stmt = DB::get()->prepare(
            "SELECT DISTINCT ON (capteur_id, type)
                    id, capteur_id, quartier, type, valeur, unite, timestamp
             FROM   mesures
             ORDER  BY capteur_id, type, timestamp DESC"
        );
        $stmt->execute();

        Response::success($stmt->fetchAll());
    }
}
