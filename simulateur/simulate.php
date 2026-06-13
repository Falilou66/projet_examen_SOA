<?php

$gatewayUrl = getenv('GATEWAY_URL') ?: 'http://gateway:80';
$interval   = (int)(getenv('INTERVAL_SECONDS') ?: 5);

$capteurs = [
    ['id' => 'CAP-PLATEAU-001',     'quartier' => 'Plateau'],
    ['id' => 'CAP-MEDINA-001',      'quartier' => 'Médina'],
    ['id' => 'CAP-PARCELLES-001',   'quartier' => 'Parcelles Assainies'],
    ['id' => 'CAP-ALMADIES-001',    'quartier' => 'Almadies'],
    ['id' => 'CAP-GRANDDARKAR-001', 'quartier' => 'Grand Dakar'],
];

$types = [
    'temperature' => ['min' => 25, 'max' => 47, 'unite' => '°C'],
    'humidite'    => ['min' => 40, 'max' => 98, 'unite' => '%'],
    'aqi'         => ['min' => 30, 'max' => 180,'unite' => 'indice'],
    'bruit'       => ['min' => 40, 'max' => 92, 'unite' => 'dB'],
    'eau'         => ['min' => 0,  'max' => 100,'unite' => 'cm'],
];

echo "[SenCity Simulator] Démarrage — Gateway: $gatewayUrl — Intervalle: {$interval}s\n";

// Attendre que le gateway soit prêt
echo "[SenCity Simulator] Attente du gateway...\n";
for ($i = 0; $i < 30; $i++) {
    $ctx  = stream_context_create(['http' => ['timeout' => 3, 'ignore_errors' => true]]);
    $resp = @file_get_contents("$gatewayUrl/api/surveillance/health", false, $ctx);
    if ($resp !== false) {
        echo "[SenCity Simulator] Gateway prêt !\n";
        break;
    }
    sleep(3);
    if ($i === 29) {
        echo "[SenCity Simulator] Gateway inaccessible après 90s, arrêt.\n";
        exit(1);
    }
}

$tick = 0;

while (true) {
    // Sélectionner un capteur et un type au hasard
    $capteur = $capteurs[array_rand($capteurs)];
    $typeKey = array_rand($types);
    $config  = $types[$typeKey];

    // Valeur aléatoire avec légère tendance vers les valeurs critiques (10% du temps)
    $forceAlerte = (rand(1, 10) === 1);
    if ($forceAlerte) {
        $seuils = ['temperature' => 43, 'humidite' => 96, 'aqi' => 155, 'bruit' => 87, 'eau' => 82];
        $valeur = $seuils[$typeKey] + round(rand(0, 30) / 10, 1);
    } else {
        $valeur = round($config['min'] + mt_rand() / mt_getrandmax() * ($config['max'] - $config['min']), 1);
    }

    $payload = json_encode([
        'capteur_id' => $capteur['id'],
        'quartier'   => $capteur['quartier'],
        'type'       => $typeKey,
        'valeur'     => $valeur,
        'unite'      => $config['unite'],
    ]);

    $ctx = stream_context_create([
        'http' => [
            'method'         => 'POST',
            'header'         => "Content-Type: application/json\r\nContent-Length: " . strlen($payload) . "\r\n",
            'content'        => $payload,
            'timeout'        => 5,
            'ignore_errors'  => true,
        ]
    ]);

    $result = @file_get_contents("$gatewayUrl/api/surveillance/mesures", false, $ctx);
    $ts     = date('H:i:s');

    if ($result !== false) {
        $data = json_decode($result, true);
        if (!empty($data['success'])) {
            $flag = $forceAlerte ? ' ⚠️  ALERTE' : '';
            echo "[$ts] {$capteur['quartier']} — $typeKey: $valeur {$config['unite']}$flag\n";
        } else {
            echo "[$ts] Erreur API: " . ($data['error'] ?? 'inconnue') . "\n";
        }
    } else {
        echo "[$ts] Impossible de contacter le gateway\n";
    }

    // Déclencher une vérification des seuils toutes les 5 mesures
    $tick++;
    if ($tick % 5 === 0) {
        $ctx2 = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => "Content-Length: 0\r\n",
                'timeout'       => 5,
                'ignore_errors' => true,
            ]
        ]);
        $res = @file_get_contents("$gatewayUrl/api/incidents/verifier", false, $ctx2);
        if ($res !== false) {
            $data = json_decode($res, true);
            $nb   = $data['data']['incidents_crees'] ?? 0;
            if ($nb > 0) {
                echo "[$ts] *** $nb nouvel(s) incident(s) créé(s) ***\n";
            }
        }
    }

    sleep($interval);
}
