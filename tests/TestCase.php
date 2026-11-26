<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\ParallelTesting;
use Override;

abstract class TestCase extends BaseTestCase
{
    /**
     * Feature tests do not need built assets.
     */
    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * Each paratest worker gets its own MongoDB database, so parallel tests
     * never see each other's documents. It is set before any trait's setUp
     * runs, so RefreshesMongoDatabase empties the right one.
     */
    #[Override]
    public function createApplication(): Application
    {
        $app = parent::createApplication();

        $token = ParallelTesting::token();
        $database = 'printopoly_testing' . ($token === false ? '' : '_' . $token);

        $app->make(Repository::class)->set('database.connections.mongodb.database', $database);

        return $app;
    }
}
