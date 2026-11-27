<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Listeners;

use App\Models\PrintJob;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Events\PrintRunFailedEvent;
use App\Modules\Print\Listeners\MarkFailedPrintRun;
use App\Modules\Print\Support\PrintProgress;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class MarkFailedPrintRunTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_parts_that_wait_or_run_fail_with_a_timeout_and_the_done_ones_stay(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $progress = resolve(PrintProgress::class);
        $progress->setActive($job, true);
        $progress->record($job, PrintSet::HOME, PrintPart::CARDS, PartStatus::DONE, cacheKey: 'sleutel-kaarten');
        $progress->record($job, PrintSet::HOME, PrintPart::MONEY, PartStatus::RUNNING);
        $progress->record($job, PrintSet::HOME, PrintPart::TOKENS, PartStatus::WAITING, after: PrintPart::MONEY);

        resolve(MarkFailedPrintRun::class)->handle(new PrintRunFailedEvent($job->publicId(), [['home', 'cards'], ['home', 'money'], ['home', 'tokens'], ['home', 'no-such-part']]));

        $stored = $job->refresh();
        self::assertNull($stored->active_at);
        self::assertSame(['status' => PartStatus::DONE, 'cache_key' => 'sleutel-kaarten', 'error' => null], $stored->recordedState(PrintSet::HOME, PrintPart::CARDS));
        self::assertSame(['status' => PartStatus::FAILED, 'cache_key' => null, 'error' => 'timeout'], $stored->recordedState(PrintSet::HOME, PrintPart::MONEY));
        self::assertSame(['status' => PartStatus::FAILED, 'cache_key' => null, 'error' => 'timeout'], $stored->recordedState(PrintSet::HOME, PrintPart::TOKENS));
    }

    public function test_a_run_whose_job_is_gone_changes_nothing(): void
    {
        resolve(MarkFailedPrintRun::class)->handle(new PrintRunFailedEvent('000000000000000000000000', [['home', 'cards']]));

        self::assertSame(0, PrintJob::query()->count());
    }
}
