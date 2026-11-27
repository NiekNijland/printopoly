<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Jobs;

use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Analytics\Support\FeatureCounter;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Jobs\GeneratePrintJob;
use App\Modules\Print\Support\PrintProgress;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use RuntimeException;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class GeneratePrintJobTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_it_runs_on_the_pdf_queue(): void
    {
        $queued = new GeneratePrintJob('job-1', [['home', 'cards']]);

        self::assertSame('pdf', $queued->queue);
    }

    public function test_the_parts_are_made_with_their_instructions_and_the_order_sheet_and_the_run_ends(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        resolve(PrintProgress::class)->setActive($job, true);

        $this->handle($job->publicId(), [['printer', 'cards'], ['printer', 'money']]);

        $stored = $job->refresh();
        self::assertNull($stored->active_at);
        self::assertSame(PartStatus::Done, $stored->recordedState(PrintSet::Printer, PrintPart::Cards)['status']);
        self::assertSame(PartStatus::Done, $stored->recordedState(PrintSet::Printer, PrintPart::Money)['status']);
        $cards = PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', 'part')->where('part', 'cards')->firstOrFail();
        self::assertSame($cards->cache_key, $stored->recordedState(PrintSet::Printer, PrintPart::Cards)['cache_key']);
        self::assertSame(2, PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', 'instructions')->count());
        self::assertSame(1, PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', 'order_sheet')->where('set', 'printer')->count());
        self::assertSame(1, $this->featureCount('print_cards'));
        self::assertSame(1, $this->featureCount('print_money'));
    }

    public function test_a_part_that_is_gone_since_the_run_was_queued_is_left_out(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        $this->handle($job->publicId(), [['home', 'dice'], ['home', 'cards']]);

        $stored = $job->refresh();
        self::assertArrayNotHasKey('home_dice', $stored->states);
        self::assertSame(PartStatus::Done, $stored->recordedState(PrintSet::Home, PrintPart::Cards)['status']);
    }

    public function test_a_crashing_part_fails_with_its_reason_and_the_next_part_is_still_made(): void
    {
        Exceptions::fake([RuntimeException::class]);
        $job = PrintScenario::createAnonymousJob($this);
        $renderer = PrintScenario::renderer();
        $renderer->mode = 'crash';

        $this->handle($job->publicId(), [['printer', 'cards']]);
        $renderer->mode = 'ok';
        $this->handle($job->publicId(), [['printer', 'money']]);

        $stored = $job->refresh();
        self::assertSame(['status' => PartStatus::Failed, 'cache_key' => null, 'error' => 'other'], $stored->recordedState(PrintSet::Printer, PrintPart::Cards));
        self::assertSame(PartStatus::Done, $stored->recordedState(PrintSet::Printer, PrintPart::Money)['status']);
        self::assertNull($stored->active_at);
        Exceptions::assertReported(static fn (RuntimeException $exception): bool => $exception->getMessage() === 'Chrome crashed.');
        self::assertSame(0, $this->featureCount('print_cards'));
    }

    public function test_a_job_that_is_gone_is_left_alone(): void
    {
        $this->handle('000000000000000000000000', [['home', 'cards']]);

        self::assertSame(0, PrintJob::query()->count());
        self::assertSame(0, PrintFile::query()->count());
    }

    public function test_a_dead_worker_fails_the_parts_that_still_wait_and_keeps_the_done_ones(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $progress = resolve(PrintProgress::class);
        $progress->setActive($job, true);
        $progress->record($job, PrintSet::Home, PrintPart::Cards, PartStatus::Done, cacheKey: 'sleutel-kaarten');
        $progress->record($job, PrintSet::Home, PrintPart::Money, PartStatus::Running);
        $progress->record($job, PrintSet::Home, PrintPart::Tokens, PartStatus::Waiting, after: PrintPart::Money);

        new GeneratePrintJob($job->publicId(), [['home', 'cards'], ['home', 'money'], ['home', 'tokens'], ['home', 'dice']])->failed(new RuntimeException('Worker killed.'));

        $stored = $job->refresh();
        self::assertNull($stored->active_at);
        self::assertSame(['status' => PartStatus::Done, 'cache_key' => 'sleutel-kaarten', 'error' => null], $stored->recordedState(PrintSet::Home, PrintPart::Cards));
        self::assertSame(['status' => PartStatus::Failed, 'cache_key' => null, 'error' => 'timeout'], $stored->recordedState(PrintSet::Home, PrintPart::Money));
        self::assertSame(['status' => PartStatus::Failed, 'cache_key' => null, 'error' => 'timeout'], $stored->recordedState(PrintSet::Home, PrintPart::Tokens));
    }

    public function test_a_dead_worker_of_a_job_that_is_gone_changes_nothing(): void
    {
        new GeneratePrintJob('000000000000000000000000', [['home', 'cards']])->failed(new RuntimeException('Worker killed.'));

        self::assertSame(0, PrintJob::query()->count());
    }

    /**
     * @param list<array{string, string}> $targets
     */
    private function handle(string $printJobId, array $targets): void
    {
        app()->call([new GeneratePrintJob($printJobId, $targets), 'handle']);
    }

    private function featureCount(string $event): int
    {
        $row = DB::connection('mongodb')->table(FeatureCounter::COLLECTION)->where('event', $event)->first();
        $fields = is_object($row) ? get_object_vars($row) : [];
        $count = $fields['count'] ?? 0;

        return is_int($count) ? $count : 0;
    }
}
