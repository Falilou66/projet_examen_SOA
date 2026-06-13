<?php

use Controllers\RapportController;

$rapport = new RapportController();

$router->get('/health',               fn($r, $p) => $rapport->health($r, $p));
$router->get('/rapport/temps-reel',   fn($r, $p) => $rapport->tempsReel($r, $p));
$router->get('/rapport/statistiques', fn($r, $p) => $rapport->statistiques($r, $p));
$router->get('/rapport/historique',   fn($r, $p) => $rapport->historique($r, $p));
$router->get('/rapport/tendances',    fn($r, $p) => $rapport->tendances($r, $p));
$router->get('/rapport/export',       fn($r, $p) => $rapport->export($r, $p));
