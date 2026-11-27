<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Analytics\Support;

use App\Modules\Analytics\Enums\FeatureEvent;
use App\Modules\Analytics\Support\FeatureCounter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use InvalidArgumentException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class FeatureCounterTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_it_adds_up_per_event_and_per_day_in_utc(): void
    {
        $counter = resolve(FeatureCounter::class);
        $this->travelTo(CarbonImmutable::parse('2026-11-22 23:30:00', 'Europe/Amsterdam'));

        $counter->count(FeatureEvent::BOX_CREATED);
        $counter->count(FeatureEvent::BOX_CREATED, 3);
        $counter->count(FeatureEvent::PHOTO_ADDED);

        self::assertSame([
            ['event' => 'box_created', 'day' => '2026-11-22', 'count' => 4],
            ['event' => 'photo_added', 'day' => '2026-11-22', 'count' => 1],
        ], $this->rows());
    }

    public function test_a_count_below_one_is_ignored(): void
    {
        $counter = resolve(FeatureCounter::class);

        $counter->count(FeatureEvent::BOX_CREATED, 0);
        $counter->count(FeatureEvent::BOX_CREATED, -2);

        self::assertSame([], $this->rows());
    }

    public function test_a_broken_connection_is_reported_and_forgotten(): void
    {
        Exceptions::fake([InvalidArgumentException::class]);
        config(['database.connections.mongodb' => ['driver' => 'mongodb']]);
        DB::purge('mongodb');

        resolve(FeatureCounter::class)->count(FeatureEvent::BOX_CREATED);

        Exceptions::assertReported(InvalidArgumentException::class);
    }

    /**
     * @return list<array{event: mixed, day: mixed, count: mixed}>
     */
    private function rows(): array
    {
        $rows = [];

        foreach (DB::connection('mongodb')->table(FeatureCounter::COLLECTION)->orderBy('event')->get() as $row) {
            $row = (array) $row;
            $rows[] = ['event' => $row['event'] ?? null, 'day' => $row['day'] ?? null, 'count' => $row['count'] ?? null];
        }

        return $rows;
    }
}
