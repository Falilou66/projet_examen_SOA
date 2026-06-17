<?php

$gatewayUrl      = getenv('GATEWAY_URL')      ?: 'http://gateway:80';
$authUrl         = getenv('AUTH_URL')         ?: 'http://auth:8000';
$placesUrl       = getenv('PLACES_URL')       ?: 'http://places:8001';
$transactionsUrl = getenv('TRANSACTIONS_URL') ?: 'http://transactions:8002';
$interval        = (int)(getenv('INTERVAL_SECONDS') ?: 5);

// ── Authentification JWT ──────────────────────────────────────
$jwtToken = null;

function authenticate(string $authUrl): ?string {
    $ch = curl_init("$authUrl/login");
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['username' => 'simul', 'password' => 'simul2026']),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    if (!$resp) return null;
    $data = json_decode($resp, true);
    return $data['data']['token'] ?? null;
}

// Obtenir le token au démarrage
echo "[AUTH] Authentification du simulateur...\n";
for ($i = 0; $i < 5; $i++) {
    $jwtToken = authenticate($authUrl);
    if ($jwtToken) { echo "[AUTH] Token JWT obtenu (rôle: agent)\n"; break; }
    echo "[AUTH] Tentative " . ($i+1) . "/5 — attente 3s...\n";
    sleep(3);
}
if (!$jwtToken) { echo "[AUTH] Impossible d'obtenir un token — arrêt\n"; exit(1); }

// Plaques simulées (format sénégalais)
$plaques = [
    'DK-1234-A', 'DK-5678-B', 'DK-9012-C', 'DK-3456-D', 'DK-7890-E',
    'DK-2345-F', 'DK-6789-G', 'DK-0123-H', 'DK-4567-I', 'DK-8901-J',
    'TH-1111-A', 'TH-2222-B', 'TH-3333-C', 'KL-4444-A', 'KL-5555-B',
    'ZI-1234-A', 'ZI-5678-B', 'MB-9012-A', 'MB-3456-B', 'GU-7890-A',

    
];

$typesVehicule = ['voiture', 'voiture', 'voiture', 'moto', 'moto', 'camion'];
$zones = ['A', 'A', 'A', 'B', 'B', 'C'];  // pondéré par taille

function curlRequest(string $method, string $url, ?array $payload, string $token, int $timeout): ?array {
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    if ($token !== '') $headers[] = "Authorization: Bearer " . trim($token);
    if ($method === 'POST') {
        $body = json_encode($payload);
        $headers[] = 'Content-Type: application/json';
        $headers[] = 'Content-Length: ' . strlen($body);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => $timeout,
        CURLOPT_HEADER         => false,
        CURLOPT_VERBOSE        => false,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($err) { echo "[CURL ERROR] $method $url → $err\n"; return null; }
    if ($code === 401) { echo "[DEBUG 401] token=" . substr($token, 0, 20) . "... url=$url\n"; }
    if ($resp === false || $resp === '') return null;
    return json_decode($resp, true);
}

function httpGet(string $url, string $token = '', int $timeout = 5): ?array {
    return curlRequest('GET', $url, null, $token, $timeout);
}

function httpPost(string $url, array $payload, string $token = '', int $timeout = 5): ?array {
    return curlRequest('POST', $url, $payload, $token, $timeout);
}

echo "[SmartParking] Démarrage — Gateway: $gatewayUrl — Intervalle: {$interval}s\n";

// Attendre que la gateway et les services soient prêts
echo "[SmartParking] Attente des services...\n";
for ($i = 0; $i < 40; $i++) {
    $health = httpGet("$placesUrl/health", '', 3);
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
    $stats   = httpGet("$placesUrl/stats",       $jwtToken);
    $encours = httpGet("$transactionsUrl/encours", $jwtToken);

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

        $res = httpPost("$transactionsUrl/entree", [
            'plaque'        => $plaque,
            'type_vehicule' => $type,
            'zone'          => $zone,
        ], $jwtToken);

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
            $res = httpPost("$transactionsUrl/sortie", [
                'transaction_id' => $tx['id'],
            ], $jwtToken);

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
        $s = httpGet("$placesUrl/stats", $jwtToken);
        if (!empty($s['data'])) {
            $d = $s['data'];
            $taux = $d['taux_occupation'] ?? 0;
            echo "[$ts] === RÉSUMÉ : {$d['libres']} libres / {$d['total']} places — Taux: {$taux}% ===\n";
        }
    }

    sleep($interval);
}
