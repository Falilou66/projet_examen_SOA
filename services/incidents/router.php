<?php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/api-docs') {
    header('Content-Type: application/x-yaml; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    readfile(__DIR__ . '/openapi.yaml');
    exit;
}

require __DIR__ . '/index.php';
