<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use MongoDB\Model\IndexInfo;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\MongoIndexes;
use Tests\TestCase;

final class LookupIndexesTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_migrations_give_every_looked_up_field_an_index(): void
    {
        self::assertSame(0, Artisan::call('migrate'));

        self::assertContains(['google_id' => 1], MongoIndexes::keys('users'));
        self::assertContains(['email' => 1], MongoIndexes::keys('users'));
        self::assertContains(['last_active_at' => 1], MongoIndexes::keys('users'));
        self::assertContains(['inactivity_warning_sent_at' => 1], MongoIndexes::keys('users'));
        self::assertContains(['replaced_tokens' => 1], MongoIndexes::keys('collection_boxes'));
        self::assertContains(['print_job_id' => 1, 'kind' => 1, 'part' => 1, 'set' => 1, 'cache_key' => 1], MongoIndexes::keys('print_files'));
        self::assertContains(['active_at' => 1], MongoIndexes::keys('print_jobs'));
    }

    public function test_the_account_indexes_are_unique(): void
    {
        self::assertSame(0, Artisan::call('migrate'));

        $unique = array_map(
            static fn (IndexInfo $index): bool => $index->isUnique(),
            array_filter(MongoIndexes::of('users'), static fn (IndexInfo $index): bool => in_array($index->getName(), ['google_id_1', 'email_1'], true)),
        );

        self::assertSame([true, true], array_values($unique));
    }

    public function test_rolling_back_drops_the_lookup_indexes(): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        $migration = require database_path('migrations/2026_11_26_120000_create_lookup_indexes.php');
        self::assertInstanceOf(Migration::class, $migration);
        self::assertTrue(method_exists($migration, 'down'));
        $migration->down();

        self::assertNotContains(['google_id' => 1], MongoIndexes::keys('users'));
        self::assertNotContains(['active_at' => 1], MongoIndexes::keys('print_jobs'));
        self::assertContains(['token' => 1], MongoIndexes::keys('print_jobs'));
    }
}
