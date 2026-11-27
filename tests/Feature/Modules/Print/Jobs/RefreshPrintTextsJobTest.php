<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Jobs;

use App\Models\PrintFile;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Events\PrintStatusUpdatedEvent;
use App\Modules\Print\Jobs\RefreshPrintTextsJob;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class RefreshPrintTextsJobTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_it_is_unique_per_job_and_set_on_the_pdf_queue(): void
    {
        $queued = new RefreshPrintTextsJob('job-zaterdagclub', 'home');

        self::assertSame('job-zaterdagclub|home', $queued->uniqueId());
        self::assertSame('pdf', $queued->queue);
    }

    public function test_a_made_order_sheet_clears_an_earlier_failure_and_tells_the_page(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'home', ['cards'])->assertOk();
        PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', 'order_sheet')->delete();
        Cache::put(RefreshPrintTextsJob::failedKey($job, PrintSet::Home), true);
        Event::fake([PrintStatusUpdatedEvent::class]);

        app()->call([new RefreshPrintTextsJob($job->publicId(), 'home'), 'handle']);

        self::assertSame(1, PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', 'order_sheet')->where('set', 'home')->count());
        self::assertFalse(Cache::has('print-order-sheet-failed:' . $job->publicId() . ':home'));
        Event::assertDispatchedTimes(PrintStatusUpdatedEvent::class, 1);
    }

    public function test_a_set_without_an_order_sheet_is_marked_for_ten_minutes(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        Event::fake([PrintStatusUpdatedEvent::class]);

        app()->call([new RefreshPrintTextsJob($job->publicId(), 'printer'), 'handle']);

        $key = RefreshPrintTextsJob::failedKey($job, PrintSet::Printer);
        self::assertSame('print-order-sheet-failed:' . $job->publicId() . ':printer', $key);
        self::assertTrue(Cache::get($key));
        Event::assertDispatchedTimes(PrintStatusUpdatedEvent::class, 1);

        $this->travel(11)->minutes();
        self::assertFalse(Cache::has($key));
    }

    public function test_an_unknown_job_or_set_does_nothing(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        Event::fake([PrintStatusUpdatedEvent::class]);

        app()->call([new RefreshPrintTextsJob('000000000000000000000000', 'home'), 'handle']);
        app()->call([new RefreshPrintTextsJob($job->publicId(), 'garage'), 'handle']);

        Event::assertNotDispatched(PrintStatusUpdatedEvent::class);
        self::assertSame(0, PrintFile::query()->count());
    }
}
