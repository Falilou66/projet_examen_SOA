<?php

use Controllers\CapteurController;
use Controllers\MesureController;

$mesure  = new MesureController();
$capteur = new CapteurController();

$router->get('/health',            fn($r, $p) => $mesure->health($r, $p));
$router->post('/mesures',          fn($r, $p) => $mesure->store($r, $p));
$router->get('/mesures/dernieres', fn($r, $p) => $mesure->dernieres($r, $p));
$router->get('/mesures',           fn($r, $p) => $mesure->index($r, $p));
$router->get('/mesures/{id}',      fn($r, $p) => $mesure->show($r, $p));
$router->get('/capteurs',          fn($r, $p) => $capteur->index($r, $p));
$router->get('/capteurs/{id}',     fn($r, $p) => $capteur->show($r, $p));
