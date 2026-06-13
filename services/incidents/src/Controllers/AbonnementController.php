<?php

namespace Controllers;

use Core\DB;
use Core\Request;
use Core\Response;

class AbonnementController
{
    public function store(Request $req, array $params): void
    {
        if (empty($req->body['token'])) {
            Response::error('Le champ token est requis', 422);
        }

        $stmt = DB::get()->prepare(
            "INSERT INTO abonnements (token, plateforme)
             VALUES (?, ?)
             ON CONFLICT (token) DO UPDATE SET plateforme = EXCLUDED.plateforme
             RETURNING *"
        );
        $stmt->execute([
            $req->body['token'],
            $req->body['plateforme'] ?? 'flutter',
        ]);

        Response::success($stmt->fetch(), 201);
    }

    public function destroy(Request $req, array $params): void
    {
        $stmt = DB::get()->prepare("DELETE FROM abonnements WHERE token = ?");
        $stmt->execute([$params['token']]);

        Response::success(['message' => 'Désabonnement effectué']);
    }
}
