<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Enums\FeatureEvent;
use App\Enums\PrintPart;
use App\Support\FeatureCounter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * The anonymous feature counter (B206): per event per day one number, and nothing about who.
 */
final class FeatureCountTest extends TestCase
{
    use RefreshesMongoDatabase;

    #[Test]
    public function the_browser_counts_an_event_without_a_session_or_a_cookie(): void
    {
        CarbonImmutable::setTestNow('2026-11-22 10:00:00');

        $response = $this->postJson('/api/count', ['event' => 'photo_added']);
        $this->postJson('/api/count', ['event' => 'photo_added']);

        $response->assertNoContent();
        self::assertSame([], $response->headers->getCookies());
        self::assertSame(2, $this->counted('photo_added', '2026-11-22'));

        $document = DB::connection('mongodb')->table(FeatureCounter::COLLECTION)->where('event', 'photo_added')->first();
        // Only the event, the day and the number: no address, no id, no content.
        self::assertEqualsCanonicalizing(['id', 'event', 'day', 'count'], array_keys((array) $document));
    }

    #[Test]
    public function the_browser_cannot_count_what_the_server_counts_or_what_is_unknown(): void
    {
        $this->postJson('/api/count', ['event' => 'print_board'])->assertNoContent();
        $this->postJson('/api/count', ['event' => 'visited_by_alice'])->assertNoContent();
        $this->postJson('/api/count', [])->assertNoContent();

        self::assertSame(0, DB::connection('mongodb')->table(FeatureCounter::COLLECTION)->count());
    }

    #[Test]
    public function each_day_has_its_own_counter(): void
    {
        $counter = resolve(FeatureCounter::class);

        CarbonImmutable::setTestNow('2026-11-22 23:00:00');
        $counter->count(FeatureEvent::printed(PrintPart::Board));
        CarbonImmutable::setTestNow('2026-11-23 01:00:00');
        $counter->count(FeatureEvent::printed(PrintPart::Board), 2);

        self::assertSame(1, $this->counted('print_board', '2026-11-22'));
        self::assertSame(2, $this->counted('print_board', '2026-11-23'));
    }

    private function counted(string $event, string $day): int
    {
        $document = DB::connection('mongodb')->table(FeatureCounter::COLLECTION)->where('event', $event)->where('day', $day)->first();
        $count = is_array($document) ? ($document['count'] ?? 0) : (is_object($document) ? ($document->count ?? 0) : 0);

        return is_int($count) ? $count : 0;
    }
}
