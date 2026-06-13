<?php

spl_autoload_register(function (string $class): void {
    $file = __DIR__ . '/src/' . str_replace('\\', '/', $class) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

use Core\Request;
use Core\Router;

$router  = new Router();
$request = new Request();

require __DIR__ . '/routes/api.php';

$router->dispatch($request);
