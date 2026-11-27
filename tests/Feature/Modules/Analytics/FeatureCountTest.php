<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Analytics;

use App\Modules\Analytics\Enums\FeatureEvent;
use App\Modules\Analytics\Support\FeatureCounter;
use App\Modules\Print\Enums\PrintPart;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * The anonymous feature counter (B206): per event per day one number, and nothing about who.
 */
final class FeatureCountTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_browser_counts_an_event_without_a_session_or_a_cookie(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-22 10:00:00'));

        $response = $this->postJson('/api/count', ['event' => 'photo_added']);
        $this->postJson('/api/count', ['event' => 'photo_added']);

        $response->assertNoContent();
        self::assertSame([], $response->headers->getCookies());
        self::assertSame(2, $this->counted('photo_added', '2026-11-22'));

        $document = DB::connection('mongodb')->table(FeatureCounter::COLLECTION)->where('event', 'photo_added')->first();
        // Only the event, the day and the number: no address, no id, no content.
        self::assertEqualsCanonicalizing(['id', 'event', 'day', 'count'], array_keys((array) $document));
    }

    public function test_the_browser_cannot_count_what_the_server_counts_or_what_is_unknown(): void
    {
        $this->postJson('/api/count', ['event' => 'print_board'])->assertNoContent();
        $this->postJson('/api/count', ['event' => 'visited_by_alice'])->assertNoContent();
        $this->postJson('/api/count', [])->assertNoContent();

        self::assertSame(0, DB::connection('mongodb')->table(FeatureCounter::COLLECTION)->count());
    }

    public function test_each_day_has_its_own_counter(): void
    {
        $counter = resolve(FeatureCounter::class);

        $this->travelTo(CarbonImmutable::parse('2026-11-22 23:00:00'));
        $counter->count(FeatureEvent::printed(PrintPart::BOARD));
        $this->travelTo(CarbonImmutable::parse('2026-11-23 01:00:00'));
        $counter->count(FeatureEvent::printed(PrintPart::BOARD), 2);

        self::assertSame(1, $this->counted('print_board', '2026-11-22'));
        self::assertSame(2, $this->counted('print_board', '2026-11-23'));
    }

    private function counted(string $event, string $day): int
    {
        $document = DB::connection('mongodb')->table(FeatureCounter::COLLECTION)->where('event', $event)->where('day', $day)->first();
        $count = $document->count ?? 0;

        return is_int($count) ? $count : 0;
    }
}
