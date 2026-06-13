<?php

namespace Core;

class Router
{
    private array $routes = [];

    public function get(string $path, callable $h): void    { $this->add('GET',    $path, $h); }
    public function post(string $path, callable $h): void   { $this->add('POST',   $path, $h); }
    public function put(string $path, callable $h): void    { $this->add('PUT',    $path, $h); }
    public function delete(string $path, callable $h): void { $this->add('DELETE', $path, $h); }

    private function add(string $method, string $path, callable $h): void
    {
        $this->routes[] = ['method' => $method, 'path' => $path, 'handler' => $h];
    }

    public function dispatch(Request $req): void
    {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');

        if ($req->method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $req->method) {
                continue;
            }

            $pattern = '#^' . preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $route['path']) . '$#';

            if (preg_match($pattern, $req->path, $m)) {
                $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
                try {
                    ($route['handler'])($req, $params);
                } catch (\Throwable $e) {
                    Response::error($e->getMessage(), 500);
                }
                return;
            }
        }

        Response::error('Route non trouvée', 404);
    }
}
