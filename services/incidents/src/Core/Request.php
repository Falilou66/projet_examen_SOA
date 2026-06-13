<?php

namespace Core;

class Request
{
    public string $method;
    public string $path;
    public array  $query;
    public array  $body;

    public function __construct()
    {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $this->query  = $_GET;

        $raw         = file_get_contents('php://input');
        $this->body  = json_decode($raw ?: '{}', true) ?? [];
    }
}
