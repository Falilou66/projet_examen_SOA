<?php

namespace Controllers;

use Core\DB;
use Core\Request;
use Core\Response;

class CapteurController
{
    public function index(Request $req, array $params): void
    {
        $stmt = DB::get()->query(
            "SELECT * FROM capteurs ORDER BY enregistre_le DESC"
        );
        Response::success($stmt->fetchAll());
    }

    public function show(Request $req, array $params): void
    {
        $db   = DB::get();
        $stmt = $db->prepare("SELECT * FROM capteurs WHERE capteur_id = ?");
        $stmt->execute([$params['id']]);
        $capteur = $stmt->fetch();

        if (!$capteur) {
            Response::error('Capteur non trouvé', 404);
        }

        // Dernière mesure par type pour ce capteur
        $stmt2 = $db->prepare(
            "SELECT DISTINCT ON (type) type, valeur, unite, timestamp
             FROM   mesures
             WHERE  capteur_id = ?
             ORDER  BY type, timestamp DESC"
        );
        $stmt2->execute([$params['id']]);
        $capteur['dernieres_mesures'] = $stmt2->fetchAll();

        Response::success($capteur);
    }
}
