<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\PrintJob;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Events\PrintStatusUpdatedEvent;
use App\Modules\Print\Support\PrintProgress;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class PrintProgressTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_a_recorded_part_changes_only_its_own_entry(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $progress = resolve(PrintProgress::class);
        $progress->record($job, PrintSet::Printer, PrintPart::Board, PartStatus::Done, cacheKey: 'sleutel-bord');

        $progress->record($job, PrintSet::Printer, PrintPart::Cards, PartStatus::Failed, error: 'photos', after: PrintPart::Board);

        $states = $job->refresh()->states;
        self::assertSame(['status' => 'done', 'cache_key' => 'sleutel-bord', 'error' => null, 'after' => null], $states['printer_board']);
        self::assertSame(['status' => 'failed', 'cache_key' => null, 'error' => 'photos', 'after' => 'board'], $states['printer_cards']);
    }

    public function test_recording_a_part_tells_the_open_page_the_fresh_status(): void
    {
        Event::fake([PrintStatusUpdatedEvent::class]);
        $job = PrintScenario::createAnonymousJob($this);
        $progress = resolve(PrintProgress::class);
        $progress->setActive($job, true);

        $progress->record($job, PrintSet::Home, PrintPart::Money, PartStatus::Waiting);

        Event::assertDispatchedTimes(PrintStatusUpdatedEvent::class, 1);
        Event::assertDispatched(PrintStatusUpdatedEvent::class, static function (PrintStatusUpdatedEvent $event) use ($job): bool {
            $payload = $event->broadcastWith();
            $parts = is_array($payload['parts'] ?? null) ? $payload['parts'] : [];
            $money = array_values(array_filter($parts, static fn (mixed $row): bool => is_array($row) && $row['set'] === 'home' && $row['part'] === 'money'));

            return $event->broadcastOn()->name === 'print-anon.' . $job->token
                && $payload['busy'] === true
                && count($money) === 1
                && $money[0]['status'] === 'waiting';
        });
    }

    public function test_a_run_switches_on_with_the_current_time_and_off_again(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $progress = resolve(PrintProgress::class);

        $progress->setActive($job, true);

        $active = PrintJob::query()->whereKey($job->getKey())->firstOrFail();
        self::assertSame(now()->toDateTimeString(), $active->active_at?->toDateTimeString());
        self::assertTrue($active->isBusy());

        $progress->setActive($job, false);
        $idle = PrintJob::query()->whereKey($job->getKey())->firstOrFail();
        self::assertNull($idle->active_at);
        self::assertFalse($idle->isBusy());
    }

    public function test_a_run_older_than_the_stale_limit_no_longer_counts_as_busy(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        resolve(PrintProgress::class)->setActive($job, true);

        $this->travel(PrintProgress::STALE_AFTER_MINUTES)->minutes();
        self::assertFalse(PrintJob::query()->whereKey($job->getKey())->firstOrFail()->isBusy());
    }
}
