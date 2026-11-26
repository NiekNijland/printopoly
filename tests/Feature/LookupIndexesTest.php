<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use MongoDB\Laravel\Connection;
use MongoDB\Model\IndexInfo;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class LookupIndexesTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_migrations_give_every_looked_up_field_an_index(): void
    {
        self::assertSame(0, Artisan::call('migrate'));

        self::assertContains(['google_id' => 1], $this->keys('users'));
        self::assertContains(['email' => 1], $this->keys('users'));
        self::assertContains(['last_active_at' => 1], $this->keys('users'));
        self::assertContains(['inactivity_warning_sent_at' => 1], $this->keys('users'));
        self::assertContains(['replaced_tokens' => 1], $this->keys('collection_boxes'));
        self::assertContains(['print_job_id' => 1, 'kind' => 1, 'part' => 1, 'set' => 1, 'cache_key' => 1], $this->keys('print_files'));
        self::assertContains(['active_at' => 1], $this->keys('print_jobs'));
    }

    public function test_the_account_indexes_are_not_unique(): void
    {
        self::assertSame(0, Artisan::call('migrate'));

        $unique = array_map(
            static fn (IndexInfo $index): bool => $index->isUnique(),
            array_filter($this->indexes('users'), static fn (IndexInfo $index): bool => in_array($index->getName(), ['google_id_1', 'email_1'], true)),
        );

        self::assertSame([false, false], array_values($unique));
    }

    public function test_rolling_back_drops_the_lookup_indexes(): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        $migration = require database_path('migrations/2026_11_26_120000_create_lookup_indexes.php');
        self::assertInstanceOf(Migration::class, $migration);
        self::assertTrue(method_exists($migration, 'down'));
        $migration->down();

        self::assertNotContains(['google_id' => 1], $this->keys('users'));
        self::assertNotContains(['active_at' => 1], $this->keys('print_jobs'));
        self::assertContains(['token' => 1], $this->keys('print_jobs'));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function keys(string $collection): array
    {
        $keys = [];

        foreach ($this->indexes($collection) as $index) {
            $key = [];

            foreach ($index->getKey() as $field => $order) {
                $key[(string) $field] = $order;
            }

            $keys[] = $key;
        }

        return $keys;
    }

    /**
     * @return list<IndexInfo>
     */
    private function indexes(string $collection): array
    {
        $connection = DB::connection('mongodb');
        self::assertInstanceOf(Connection::class, $connection);

        return iterator_to_array($connection->getDatabase()->selectCollection($collection)->listIndexes(), false);
    }
}
