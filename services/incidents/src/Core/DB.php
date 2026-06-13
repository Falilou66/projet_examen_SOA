<?php

namespace Core;

class DB
{
    private static ?\PDO $pdo = null;

    public static function get(): \PDO
    {
        if (!self::$pdo) {
            $host   = getenv('DB_HOST')     ?: 'localhost';
            $port   = getenv('DB_PORT')     ?: '5432';
            $dbname = getenv('DB_NAME')     ?: 'sencity';
            $user   = getenv('DB_USER')     ?: 'admin';
            $pass   = getenv('DB_PASSWORD') ?: '';
            $schema = getenv('DB_SCHEMA')   ?: 'public';

            self::$pdo = new \PDO(
                "pgsql:host=$host;port=$port;dbname=$dbname",
                $user,
                $pass,
                [
                    \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                ]
            );
            self::$pdo->exec("SET search_path TO \"$schema\"");
        }
        return self::$pdo;
    }
}
