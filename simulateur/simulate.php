<?php

$gatewayUrl = getenv('GATEWAY_URL') ?: 'http://gateway:80';
$interval   = (int)(getenv('INTERVAL_SECONDS') ?: 5);

// Plaques simulées (format sénégalais)
$plaques = [
    'DK-1234-A', 'DK-5678-B', 'DK-9012-C', 'DK-3456-D', 'DK-7890-E',
    'DK-2345-F', 'DK-6789-G', 'DK-0123-H', 'DK-4567-I', 'DK-8901-J',
    'TH-1111-A', 'TH-2222-B', 'TH-3333-C', 'KL-4444-A', 'KL-5555-B',
    'ZI-1234-A', 'ZI-5678-B', 'MB-9012-A', 'MB-3456-B', 'GU-7890-A',
];

$typesVehicule = ['voiture', 'voiture', 'voiture', 'moto', 'moto', 'camion'];
$zones = ['A', 'A', 'A', 'B', 'B', 'C'];  // pondéré par taille

function httpGet(string $url, int $timeout = 5): ?array {
    $ctx  = stream_context_create(['http' => ['timeout' => $timeout, 'ignore_errors' => true]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) return null;
    return json_decode($resp, true);
}

function httpPost(string $url, array $payload, int $timeout = 5): ?array {
    $body = json_encode($payload);
    $ctx  = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/json\r\nContent-Length: " . strlen($body) . "\r\n",
            'content'       => $body,
            'timeout'       => $timeout,
            'ignore_errors' => true,
        ]
    ]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) return null;
    return json_decode($resp, true);
}

echo "[SmartParking] Démarrage — Gateway: $gatewayUrl — Intervalle: {$interval}s\n";

// Attendre que la gateway et les services soient prêts
echo "[SmartParking] Attente des services...\n";
for ($i = 0; $i < 40; $i++) {
    $health = httpGet("$gatewayUrl/api/places/health", 3);
    if (!empty($health['success'])) {
        echo "[SmartParking] Services prêts !\n";
        break;
    }
    sleep(4);
    if ($i === 39) {
        echo "[SmartParking] Services inaccessibles après 160s, arrêt.\n";
        exit(1);
    }
}

$tick = 0;

while (true) {
    $ts = date('H:i:s');

    // Récupérer les stats actuelles
    $stats   = httpGet("$gatewayUrl/api/places/stats");
    $encours = httpGet("$gatewayUrl/api/transactions/encours");

    $libres  = (int)($stats['data']['libres']  ?? 0);
    $occupes = (int)($stats['data']['occupees'] ?? 0);
    $txEnCours = $encours['data'] ?? [];

    // Décision : entrer ou sortir ?
    // Si parking plein → sortie obligatoire. Si vide → entrée obligatoire.
    // Sinon : 55% entrée, 45% sortie
    $doEntree = true;
    if ($libres === 0) {
        $doEntree = false;
    } elseif ($occupes === 0 || count($txEnCours) === 0) {
        $doEntree = true;
    } else {
        $doEntree = (rand(1, 100) <= 55);
    }

    if ($doEntree) {
        // Simuler une entrée
        $plaque = $plaques[array_rand($plaques)];
        $type   = $typesVehicule[array_rand($typesVehicule)];
        $zone   = $zones[array_rand($zones)];

        $res = httpPost("$gatewayUrl/api/transactions/entree", [
            'plaque'        => $plaque,
            'type_vehicule' => $type,
            'zone'          => $zone,
        ]);

        if (!empty($res['success'])) {
            $tx = $res['data'];
            echo "[$ts] ++ ENTRÉE  {$tx['plaque']} ({$tx['type_vehicule']}) → Place {$tx['place_code']} (Zone {$tx['zone_code']}) | Réf: {$tx['reference']}\n";
        } elseif (!empty($res['error'])) {
            echo "[$ts] Entrée refusée: {$res['error']}\n";
        } else {
            echo "[$ts] Impossible de contacter le service transactions (entrée)\n";
        }
    } else {
        // Simuler une sortie — choisir une transaction en cours au hasard
        if (empty($txEnCours)) {
            echo "[$ts] Aucune transaction en cours pour sortir\n";
        } else {
            $tx = $txEnCours[array_rand($txEnCours)];
            $res = httpPost("$gatewayUrl/api/transactions/sortie", [
                'transaction_id' => $tx['id'],
            ]);

            if (!empty($res['success'])) {
                $t = $res['data'];
                $montant = number_format($t['montant_fcfa'] ?? 0, 0, '.', ' ');
                $duree   = $t['duree_minutes'] ?? 0;
                echo "[$ts] -- SORTIE   {$t['plaque']} | Place {$t['place_code']} | {$duree} min | {$montant} FCFA\n";
            } elseif (!empty($res['error'])) {
                echo "[$ts] Sortie refusée: {$res['error']}\n";
            } else {
                echo "[$ts] Impossible de contacter le service transactions (sortie)\n";
            }
        }
    }

    // Afficher un résumé toutes les 10 itérations
    $tick++;
    if ($tick % 10 === 0) {
        $s = httpGet("$gatewayUrl/api/places/stats");
        if (!empty($s['data'])) {
            $d = $s['data'];
            $taux = $d['taux_occupation'] ?? 0;
            echo "[$ts] === RÉSUMÉ : {$d['libres']} libres / {$d['total']} places — Taux: {$taux}% ===\n";
        }
    }

    sleep($interval);
}
