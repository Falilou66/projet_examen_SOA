<?php

use Controllers\AbonnementController;
use Controllers\IncidentController;

$incident   = new IncidentController();
$abonnement = new AbonnementController();

$router->get('/health',                  fn($r, $p) => $incident->health($r, $p));
$router->get('/incidents',               fn($r, $p) => $incident->index($r, $p));
$router->get('/incidents/{id}',          fn($r, $p) => $incident->show($r, $p));
$router->put('/incidents/{id}/resoudre', fn($r, $p) => $incident->resoudre($r, $p));
$router->get('/regles',                  fn($r, $p) => $incident->regles($r, $p));
$router->put('/regles/{type}',           fn($r, $p) => $incident->updateRegle($r, $p));
$router->post('/abonnements',            fn($r, $p) => $abonnement->store($r, $p));
$router->delete('/abonnements/{token}',  fn($r, $p) => $abonnement->destroy($r, $p));
$router->post('/verifier',               fn($r, $p) => $incident->verifier($r, $p));
