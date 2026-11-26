<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Services;

use App\Models\PrintFile;
use App\Models\User;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Jobs\RefreshPrintTextsJob;
use App\Modules\Print\Support\InstructionPdfBuilder;
use App\Modules\Print\Support\PrintProgress;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class PrintStatusServiceTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_nothing_is_made_before_the_user_asks(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();

        self::assertSame(0, PrintScenario::renderer()->calls);
        self::assertSame(0, PrintFile::query()->count());
        foreach (PrintScenario::jsonRows($status, 'parts') as $part) {
            self::assertSame('idle', $part['status']);
        }
    }

    public function test_a_failed_part_says_why(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::renderer()->mode = 'timeout';
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();
        self::assertSame('timeout', PrintScenario::partRow($this, $job, PrintSet::Printer, PrintPart::Board)['reason']);

        PrintScenario::renderer()->mode = 'wrong_count';
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        self::assertSame('layout', PrintScenario::partRow($this, $job, PrintSet::Printer, PrintPart::Cards)['reason']);

        PrintScenario::renderer()->mode = 'crash';
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();
        self::assertSame('other', PrintScenario::partRow($this, $job, PrintSet::Printer, PrintPart::Board)['reason']);

        PrintScenario::renderer()->mode = 'ok';
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();
        self::assertNull(PrintScenario::partRow($this, $job, PrintSet::Printer, PrintPart::Board)['reason'], 'a part that is done has no reason');
    }

    public function test_the_status_follows_the_cache_key_when_the_edition_of_an_account_changes(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);

        $job = PrintScenario::printJobFor($this, $user, $edition);

        PrintScenario::generate($this, $job, 'printer', ['cards', 'money'])->assertOk();
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));

        // Another part changes: cards stay current, money goes stale.
        $edition->forceFill(['elements' => [...$edition->elements, 'note.5' => ['color' => '#AA3322']]])->save();

        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));
        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Money));

        $this->get('/api/print/' . $job->token . '/zip/printer')->assertConflict();

        // A new release makes everything outdated (B62).
        config(['printopoly.print.release' => 'v2']);
        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));

        PrintScenario::generate($this, $job, 'printer', ['cards', 'money'])->assertOk();
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Money));
    }

    public function test_a_pdf_past_its_seven_days_reads_as_outdated(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        $file = PrintFile::query()->where('part', 'cards')->where('kind', 'part')->firstOrFail();
        $file->forceFill(['expires_at' => CarbonImmutable::now()->subMinute()])->save();

        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));
    }

    public function test_the_waiting_parts_say_what_they_wait_for(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $job->forceFill(['states' => ['printer_board' => ['status' => 'running', 'cache_key' => null, 'error' => null, 'after' => null], 'printer_cards' => ['status' => 'waiting', 'cache_key' => null, 'error' => null, 'after' => 'board']], 'active_at' => CarbonImmutable::now()])->save();

        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();

        self::assertTrue($status->json('busy'));
        $cards = PrintScenario::partRow($this, $job, PrintSet::Printer, PrintPart::Cards);
        self::assertSame(['waiting', 'board'], [$cards['status'], $cards['waitingFor']]);
    }

    public function test_a_run_whose_worker_died_reads_as_failed_after_the_timeout_and_retry_restarts_it(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $states = ['printer_cards' => ['status' => 'running', 'cache_key' => null, 'error' => null, 'after' => null]];

        // Fresh: still busy, nothing to retry yet.
        $job->forceFill(['states' => $states, 'active_at' => CarbonImmutable::now()->subMinutes(2)])->save();
        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();
        self::assertTrue($status->json('busy'));
        self::assertSame('running', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));

        // Past the timeout: failed, the page offers "Opnieuw proberen", and that starts a new run.
        $job->forceFill(['active_at' => CarbonImmutable::now()->subMinutes(PrintProgress::STALE_AFTER_MINUTES + 1)])->save();
        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();
        self::assertFalse($status->json('busy'));
        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));

        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));
    }

    public function test_the_zip_waits_until_everything_requested_is_done(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        $this->get('/api/print/' . $job->token . '/zip/printer')->assertConflict();

        PrintScenario::renderer()->mode = 'wrong_size';
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();

        $this->get('/api/print/' . $job->token . '/zip/printer')->assertConflict();
    }

    public function test_the_zip_is_not_offered_while_the_run_still_makes_the_order_sheet(): void
    {
        // R5-25 (Emma): the last part was done, the order sheet not yet, and the ZIP went without it.
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();
        $sheet = PrintFile::query()->where('kind', PrintFile::KIND_ORDER_SHEET)->where('set', 'printer')->firstOrFail();
        Storage::disk($sheet->disk)->delete($sheet->path);
        $sheet->delete();

        Queue::fake([RefreshPrintTextsJob::class]);
        resolve(PrintProgress::class)->setActive($job, true);
        $status = $this->getJson('/api/print/' . $job->token . '/status');
        self::assertFalse($status->json('printerZipReady'));
        self::assertFalse($status->json('zipPreparing'), 'the run makes the sheet itself');
        Queue::assertNothingPushed();
    }

    public function test_a_missing_order_sheet_is_made_by_the_queue_and_never_in_the_request(): void
    {
        // Right after the choices changed the queue has not made the new sheet yet. PHP-FPM cannot start Chrome in
        // production, so the ZIP waits for the queue instead of rendering the sheet itself (R5-25, B235).
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board', 'cards'])->assertOk();
        PrintFile::query()->where('kind', PrintFile::KIND_ORDER_SHEET)->delete();
        $calls = PrintScenario::renderer()->calls;

        Queue::fake([RefreshPrintTextsJob::class]);
        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();
        self::assertFalse($status->json('printerZipReady'));
        self::assertTrue($status->json('zipPreparing'));
        $this->get('/api/print/' . $job->token . '/zip/printer')->assertConflict();
        self::assertSame($calls, PrintScenario::renderer()->calls, 'no PDF rendered in a web request');
        Queue::assertPushed(RefreshPrintTextsJob::class, static fn (RefreshPrintTextsJob $queued): bool => $queued->set === 'printer' && $queued->queue === 'pdf');

        // The worker makes the sheet; then the ZIP is there, with the sheet first.
        new RefreshPrintTextsJob($job->publicId(), 'printer')->handle(resolve(InstructionPdfBuilder::class), resolve(PrintProgress::class));
        $status = $this->getJson('/api/print/' . $job->token . '/status');
        self::assertTrue($status->json('printerZipReady'));
        self::assertFalse($status->json('zipPreparing'));
        self::assertSame([
            'zaterdagclub-00-bestelblad.pdf',
            'zaterdagclub-01-bord.pdf',
            'zaterdagclub-02-kaarten-en-eigendomsbewijzen.pdf',
            'instructies/01-bord.pdf',
            'instructies/02-kaarten-en-eigendomsbewijzen.pdf',
        ], PrintScenario::zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()));
    }

    public function test_the_zip_goes_without_an_order_sheet_the_queue_could_not_make(): void
    {
        // B230: a failing sheet is in the log, and the ZIP does not wait for ever.
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();
        PrintFile::query()->where('kind', PrintFile::KIND_ORDER_SHEET)->delete();

        Queue::fake([RefreshPrintTextsJob::class]);
        PrintScenario::renderer()->mode = 'crash';
        new RefreshPrintTextsJob($job->publicId(), 'printer')->handle(resolve(InstructionPdfBuilder::class), resolve(PrintProgress::class));

        $status = $this->getJson('/api/print/' . $job->token . '/status');
        self::assertTrue($status->json('printerZipReady'));
        self::assertFalse($status->json('zipPreparing'));
        Queue::assertNothingPushed();
        self::assertSame([
            'zaterdagclub-01-bord.pdf',
            'instructies/01-bord.pdf',
        ], PrintScenario::zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()));
    }
}
