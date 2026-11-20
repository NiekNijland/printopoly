<?php

declare(strict_types=1);

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Database Connection Name
    |--------------------------------------------------------------------------
    |
    | Printopoly stores editions, assets and print files as MongoDB documents
    | (B48, B60). There is no SQL connection.
    |
    */

    'default' => env('DB_CONNECTION', 'mongodb'),

    'connections' => [

        // Production sets DB_DATABASE, DB_USERNAME and DB_PASSWORD (runbook in
        // motormonitor-ansible); the driver adds the credentials to the DSN.
        'mongodb' => [
            'driver' => 'mongodb',
            'dsn' => env('MONGODB_URI', 'mongodb://127.0.0.1:27017'),
            'database' => env('DB_DATABASE', 'printopoly'),
            'username' => env('DB_USERNAME'),
            'password' => env('DB_PASSWORD'),
            'options' => [
                'authSource' => env('DB_AUTHENTICATION_DATABASE', env('DB_DATABASE', 'printopoly')),
            ],
        ],

    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Redis Databases
    |--------------------------------------------------------------------------
    |
    | The production host shares one Redis instance between sites, so each
    | site has its own database numbers (REDIS_DB / REDIS_CACHE_DB) and a
    | second instance for queues (the `queues` connection) that only the
    | prefix separates.
    |
    */

    'redis' => [

        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug((string) env('APP_NAME', 'printopoly')) . '-database-'),
            'persistent' => env('REDIS_PERSISTENT', false),
        ],

        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '0'),
            'max_retries' => env('REDIS_MAX_RETRIES', 3),
            'backoff_algorithm' => env('REDIS_BACKOFF_ALGORITHM', 'decorrelated_jitter'),
            'backoff_base' => env('REDIS_BACKOFF_BASE', 100),
            'backoff_cap' => env('REDIS_BACKOFF_CAP', 1000),
        ],

        'cache' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_CACHE_DB', '1'),
            'max_retries' => env('REDIS_MAX_RETRIES', 3),
            'backoff_algorithm' => env('REDIS_BACKOFF_ALGORITHM', 'decorrelated_jitter'),
            'backoff_base' => env('REDIS_BACKOFF_BASE', 100),
            'backoff_cap' => env('REDIS_BACKOFF_CAP', 1000),
        ],

        'queues' => [
            'url' => env('REDIS_QUEUE_URL'),
            'host' => env('REDIS_QUEUE_HOST', env('REDIS_HOST', '127.0.0.1')),
            'username' => env('REDIS_QUEUE_USERNAME', env('REDIS_USERNAME')),
            'password' => env('REDIS_QUEUE_PASSWORD', env('REDIS_PASSWORD')),
            'port' => env('REDIS_QUEUE_PORT', '6380'),
            'database' => env('REDIS_QUEUE_DB', '0'),
            'read_timeout' => (float) env('REDIS_QUEUE_READ_TIMEOUT', 60.0),
            'max_retries' => env('REDIS_QUEUE_MAX_RETRIES', env('REDIS_MAX_RETRIES', 3)),
            'backoff_algorithm' => env('REDIS_QUEUE_BACKOFF_ALGORITHM', env('REDIS_BACKOFF_ALGORITHM', 'decorrelated_jitter')),
            'backoff_base' => env('REDIS_QUEUE_BACKOFF_BASE', env('REDIS_BACKOFF_BASE', 100)),
            'backoff_cap' => env('REDIS_QUEUE_BACKOFF_CAP', env('REDIS_BACKOFF_CAP', 1000)),
        ],

    ],

];
