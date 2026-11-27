<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\MongoIndexes;
use Tests\TestCase;

final class MigrationRollbackTest extends TestCase
{
    use RefreshesMongoDatabase;

    /**
     * @return iterable<string, array{string, array<string, list<array<string, int>>>, array<string, list<array<string, int>>>}>
     */
    public static function rollbacks(): iterable
    {
        yield 'the indexes of the print pipeline' => [
            '2026_11_20_000000_create_print_pipeline_indexes.php',
            [
                'editions' => [['user_id' => 1]],
                'assets' => [['user_id' => 1, 'ref' => 1], ['print_job_id' => 1, 'ref' => 1], ['expires_at' => 1]],
                'print_jobs' => [['token' => 1], ['user_id' => 1, 'edition_id' => 1], ['ip_hash' => 1], ['expires_at' => 1]],
                'print_files' => [['print_job_id' => 1, 'kind' => 1, 'part' => 1], ['expires_at' => 1]],
            ],
            ['users' => [['email' => 1]], 'collection_boxes' => [['token' => 1]]],
        ];
        yield 'the unique edition id per account' => [
            '2026_11_20_120000_create_editions_indexes.php',
            ['editions' => [['user_id' => 1, 'edition_id' => 1]]],
            ['editions' => [['user_id' => 1]]],
        ];
        yield 'the indexes of the collection boxes' => [
            '2026_11_21_000000_create_collection_box_indexes.php',
            [
                'collection_boxes' => [['token' => 1], ['user_id' => 1, 'edition_id' => 1], ['ip_hash' => 1], ['expires_at' => 1]],
                'box_contributions' => [['box_id' => 1, 'receipt' => 1]],
            ],
            ['print_jobs' => [['token' => 1]]],
        ];
        yield 'the index of the feature counts' => [
            '2026_11_22_120000_create_feature_counts_index.php',
            ['feature_counts' => [['event' => 1, 'day' => 1]]],
            ['print_jobs' => [['token' => 1]]],
        ];
    }

    /**
     * @param array<string, list<array<string, int>>> $gone
     * @param array<string, list<array<string, int>>> $kept
     */
    #[DataProvider('rollbacks')]
    public function test_rolling_back_drops_the_indexes_of_the_migration_and_migrating_again_restores_them(string $file, array $gone, array $kept): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        $this->assertIndexes($gone, present: true);
        $migration = require database_path('migrations/' . $file);
        self::assertInstanceOf(Migration::class, $migration);
        self::assertTrue(method_exists($migration, 'down') && method_exists($migration, 'up'));

        $migration->down();

        $this->assertIndexes($gone, present: false);
        $this->assertIndexes($kept, present: true);

        $migration->up();

        $this->assertIndexes($gone, present: true);
    }

    public function test_rolling_back_the_move_of_the_bank_name_leaves_the_editions_as_they_are(): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        $editions = DB::connection('mongodb')->table('editions');
        $editions->insert(['user_id' => 'u-1', 'edition_id' => 'e-1', 'revision' => 3, 'elements' => ['words.bank' => ['name' => 'Bank']]]);

        $before = $editions->where('edition_id', 'e-1')->first();
        $migration = require database_path('migrations/2026_11_21_180000_move_bank_name_into_words.php');
        self::assertInstanceOf(Migration::class, $migration);
        self::assertTrue(method_exists($migration, 'down'));

        $migration->down();

        self::assertEquals($before, DB::connection('mongodb')->table('editions')->where('edition_id', 'e-1')->first());
        self::assertSame(1, DB::connection('mongodb')->table('editions')->count());
    }

    /**
     * @param array<string, list<array<string, int>>> $indexes
     */
    private function assertIndexes(array $indexes, bool $present): void
    {
        foreach ($indexes as $collection => $keys) {
            foreach ($keys as $key) {
                $present
                    ? self::assertContains($key, MongoIndexes::keys($collection), "{$collection} lacks the index " . json_encode($key, JSON_THROW_ON_ERROR))
                    : self::assertNotContains($key, MongoIndexes::keys($collection), "{$collection} still has the index " . json_encode($key, JSON_THROW_ON_ERROR));
            }
        }
    }
}
