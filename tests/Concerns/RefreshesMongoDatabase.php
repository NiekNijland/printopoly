<?php

declare(strict_types=1);

namespace Tests\Concerns;

use Illuminate\Support\Facades\DB;
use LogicException;
use MongoDB\Laravel\Connection;

/**
 * Starts every test with an empty database for this worker. The TestCase
 * calls setUpRefreshesMongoDatabase() after it has picked the database.
 */
trait RefreshesMongoDatabase
{
    protected function setUpRefreshesMongoDatabase(): void
    {
        $connection = DB::connection('mongodb');

        if (! $connection instanceof Connection) {
            throw new LogicException('The mongodb connection must use the MongoDB Laravel driver.');
        }

        $connection->getDatabase()->drop();
    }
}
