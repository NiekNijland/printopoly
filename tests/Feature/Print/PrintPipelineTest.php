<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Jobs\RefreshPrintTextsJob;
use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Content\Enums\Locale;
use App\Print\InstructionPdfBuilder;
use App\Print\OrderSheetText;
use App\Print\PrintProgress;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;
use Symfony\Component\HttpFoundation\Response;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;
use ZipArchive;

final class PrintPipelineTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_an_anonymous_job_makes_the_print_shop_set_end_to_end(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        $response = PrintScenario::generate($this, $job, 'printer', ['board', 'cards', 'money', 'tokens', 'box_lid']);
        $response->assertOk()->assertJsonPath('busy', false);

        foreach ([PrintPart::Board, PrintPart::Cards, PrintPart::Money, PrintPart::Tokens, PrintPart::BoxLid] as $part) {
            self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Printer, $part), $part->value);
        }

        self::assertTrue($response->json('printerZipReady'));
        self::assertFalse($response->json('homeZipReady'), 'nothing was made for home');

        // One PDF per part with the checked page count, plus an instruction PDF per part.
        self::assertSame(5, PrintFile::query()->where('kind', 'part')->count());
        self::assertSame(5, PrintFile::query()->where('kind', 'instructions')->count());
        $cards = PrintFile::query()->where('part', 'cards')->where('kind', 'part')->firstOrFail();
        self::assertSame(120, $cards->pages, '60 cards, a front and a back each');
        Storage::disk('local')->assertExists($cards->path);

        $this->get('/api/print/' . $job->token . '/files/printer/cards')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_the_zip_holds_the_pdfs_and_the_instructions_and_never_the_test_sheet(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board', 'cards'])->assertOk();
        PrintScenario::generate($this, $job, 'home', ['calibration'])->assertOk();

        $response = $this->get('/api/print/' . $job->token . '/zip/printer')->assertOk();

        $path = (string) tempnam(sys_get_temp_dir(), 'zip-test-');
        file_put_contents($path, $response->streamedContent());

        $zip = new ZipArchive();
        self::assertTrue($zip->open($path));
        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[] = (string) $zip->getNameIndex($i);
        }

        $zip->close();
        File::delete($path);

        // The names carry the edition (B184), the order sheet comes first (B185).
        self::assertSame([
            'zaterdagclub-00-bestelblad.pdf',
            'zaterdagclub-01-bord.pdf',
            'zaterdagclub-02-kaarten-en-eigendomsbewijzen.pdf',
            'instructies/01-bord.pdf',
            'instructies/02-kaarten-en-eigendomsbewijzen.pdf',
        ], $names, 'no test sheet and no home PDFs in the print shop ZIP');
        $response->assertDownload('zaterdagclub-drukkerij-set.zip');
    }

    public function test_a_part_taken_out_of_the_set_after_it_was_made_leaves_the_zip_and_the_order_sheet(): void
    {
        // B210: the print page chooses what goes in the set, also after the PDFs are made.
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board', 'cards'])->assertOk();

        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'printer', 'skipped' => ['cards']])->assertOk();

        self::assertSame([
            'zaterdagclub-00-bestelblad.pdf',
            'zaterdagclub-01-bord.pdf',
            'instructies/01-bord.pdf',
        ], $this->zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()));
        $sheet = resolve(OrderSheetText::class)->text($job->refresh(), PrintSet::Printer, Locale::Dutch);
        self::assertStringContainsString('zaterdagclub-01-bord.pdf', $sheet);
        self::assertStringNotContainsString('kaarten-en-eigendomsbewijzen.pdf', $sheet);
    }

    public function test_the_instructions_and_file_names_follow_the_site_not_the_edition(): void
    {
        // A Dutch edition, printed from the English site (B184, bug 10 of test round 4).
        $response = $this->post('/api/print-jobs', [
            'edition' => json_encode(PrintScenario::editionArray('Familie De Vries'), JSON_THROW_ON_ERROR),
            'photos' => [PrintScenario::PHOTO_REF => PrintScenario::photoUpload()],
            'locale' => 'en',
        ], ['Accept' => 'application/json'])->assertCreated();
        self::assertStringContainsString('/en/print/', PrintScenario::jsonString($response, 'url'));
        $job = PrintJob::query()->where('token', $response->json('token'))->firstOrFail();

        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();

        $this->get('/api/print/' . $job->token . '/files/printer/board')->assertDownload('familie-de-vries-board-print-shop.pdf');
        $this->get('/api/print/' . $job->token . '/instructions/board?set=printer')->assertDownload('familie-de-vries-instructions-board.pdf');
        self::assertStringContainsString('<title>Board</title>', implode('', PrintScenario::renderer()->htmls));

        // Printing again from the Dutch site makes the instructions Dutch, also of what was made before.
        $this->postJson('/api/print/' . $job->token . '/generate', ['set' => 'printer', 'parts' => ['cards'], 'locale' => 'nl'])->assertOk();
        $names = $this->zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()->assertDownload('familie-de-vries-drukkerij-set.zip'));
        self::assertContains('instructies/01-bord.pdf', $names);
        self::assertContains('familie-de-vries-00-bestelblad.pdf', $names);
    }

    /**
     * UX 3 of test round 4: Ria changed one thing and the set button made all the money again. A new job for a
     * changed edition takes over the PDFs of the earlier job of this browser that did not change.
     */
    public function test_a_new_job_takes_over_the_pdfs_that_did_not_change(): void
    {
        $first = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $first, 'printer', ['board', 'money'])->assertOk();

        // The edition changed one card: the board and the money stay the same.
        $changed = PrintScenario::editionArray();
        $elements = is_array($changed['elements'] ?? null) ? $changed['elements'] : [];
        $elements['card.chance.01'] = ['text' => 'Ga terug naar start'];
        $changed['elements'] = $elements;
        $response = $this->post('/api/print-jobs', [
            'edition' => json_encode($changed, JSON_THROW_ON_ERROR),
            'photos' => [PrintScenario::PHOTO_REF => PrintScenario::photoUpload()],
            'previous' => $first->token,
        ], ['Accept' => 'application/json'])->assertCreated();
        $second = PrintJob::query()->where('token', $response->json('token'))->firstOrFail();
        $parts = fn (): int => count(array_filter(PrintScenario::renderer()->htmls, static fn (string $html): bool => str_contains($html, 'data-part=')));
        $before = $parts();

        PrintScenario::generate($this, $second, 'printer', ['board', 'money'])->assertOk();

        self::assertSame($before, $parts(), 'no PDF of a part was rendered again');
        self::assertSame('done', PrintScenario::partStatus($this, $second, PrintSet::Printer, PrintPart::Money));
        $this->get('/api/print/' . $second->token . '/files/printer/money')->assertOk();

        // A token of a job of an account never counts.
        $this->post('/api/print-jobs', [
            'edition' => json_encode($changed, JSON_THROW_ON_ERROR),
            'photos' => [PrintScenario::PHOTO_REF => PrintScenario::photoUpload()],
            'previous' => 'no-such-token',
        ], ['Accept' => 'application/json'])->assertCreated();
        self::assertNull(PrintJob::query()->where('token', '!=', $first->token)->where('token', '!=', $second->token)->firstOrFail()->previous_job_id);
    }

    public function test_the_order_sheet_lists_what_the_set_holds_with_the_exact_specs(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'printer', 'copies' => 3])->assertOk();
        PrintScenario::generate($this, $job, 'printer', ['board', 'cards', 'money'])->assertOk();

        PrintFile::query()->where('kind', PrintFile::KIND_ORDER_SHEET)->where('set', 'printer')->firstOrFail();
        $sheets = array_values(array_filter(PrintScenario::renderer()->htmls, static fn (string $html): bool => str_contains($html, '<title>Bestelblad</title>')));
        $html = (string) end($sheets);

        self::assertStringContainsString('Bestelblad: Zaterdagclub', $html);
        self::assertStringContainsString('Aantal sets: 3', $html);
        self::assertStringContainsString('zaterdagclub-02-kaarten-en-eigendomsbewijzen.pdf', $html);
        self::assertStringContainsString('RGB (sRGB)', $html);
        self::assertStringContainsString('Afgerond, straal 3 mm', $html);
        self::assertStringContainsString('omslaan over de lange kant', $html);
        // No bleed on the money: the sheet says why there is no TrimBox (bug 41).
        self::assertStringContainsString('geen TrimBox', $html);
        // Parts that are not made are not on it.
        self::assertStringNotContainsString('Pionnen', $html);
        // Every line says what one set takes and what that is in all (B250, Ingrid): 4 panels per set, 12 in all.
        self::assertStringContainsString('4 stuks per set, 12 in totaal', $html);
        self::assertStringContainsString('3 sets achter elkaar in deze PDF', $html);
        // A condition in a table row is never printed, and the board table keeps two columns.
        self::assertStringNotContainsString('{if:', $html);
        self::assertStringNotContainsString('board_panels', $html);
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
        ], $this->zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()));
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
        ], $this->zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()));
    }

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

    public function test_only_the_chosen_parts_are_made(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));
        self::assertSame('idle', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Board));
        self::assertSame('idle', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Money));
    }

    public function test_the_html_has_the_vite_entry_the_edition_as_json_and_a_signed_crop_per_photo(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();

        $html = PrintScenario::renderer()->htmls[0];

        self::assertStringContainsString('window.__PRINT__ = JSON.parse(', $html);
        self::assertStringContainsString('data-part="board" data-set="printer"', $html);
        self::assertStringContainsString('Content-Security-Policy', $html);
        self::assertStringContainsString('default-src &#039;none&#039;', $html);
        self::assertStringContainsString('<base href="http://127.0.0.1/">', $html);
        self::assertStringContainsString('<title>Zaterdagclub</title>', $html, 'the PDF carries the edition name as its title');
        self::assertStringContainsString('print-render', $html);
        self::assertStringContainsString('signature', $html);
        // Elements of other parts are not in this part's page.
        self::assertStringNotContainsString('Ga naar start', $html);
        self::assertStringContainsString('Molenweg', $html);
    }

    public function test_a_part_that_fails_the_pdf_check_is_marked_failed_and_the_others_go_on(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::renderer()->mode = 'wrong_size';
        PrintScenario::generate($this, $job, 'printer', ['board', 'cards'])->assertOk();

        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Board));
        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));
        self::assertSame(0, PrintFile::query()->where('kind', 'part')->count(), 'a failed PDF is never stored');

        $this->get('/api/print/' . $job->token . '/files/printer/board')->assertNotFound();
    }

    public function test_a_wrong_page_count_fails_the_part_and_retry_makes_it(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::renderer()->mode = 'wrong_count';
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));

        PrintScenario::renderer()->mode = 'ok';
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));
    }

    public function test_a_crashing_renderer_fails_only_its_part(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::renderer()->mode = 'crash';
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();

        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Board));
        self::assertFalse($job->fresh()?->isBusy(), 'a crash does not leave the job busy');
    }

    public function test_the_instructions_of_a_set_leave_out_the_other_set(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::generate($this, $job, 'home', ['board'])->assertOk();
        $home = collect(PrintScenario::renderer()->htmls)->last(fn (string $html): bool => str_contains($html, '<title>Bord</title>'));
        self::assertIsString($home);
        self::assertStringContainsString('Thuisprint-set', $home);
        self::assertStringNotContainsString('Drukkerij-set', $home);

        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();
        $printer = collect(PrintScenario::renderer()->htmls)->last(fn (string $html): bool => str_contains($html, '<title>Bord</title>'));
        self::assertIsString($printer);
        self::assertStringContainsString('Drukkerij-set', $printer);
        self::assertStringNotContainsString('Thuisprint-set', $printer);

        $url = PrintScenario::partRow($this, $job, PrintSet::Home, PrintPart::Board)['instructionsUrl'];
        self::assertIsString($url);
        $this->get($url)->assertOk();
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

    public function test_chrome_gets_two_minutes_to_print_a_sheet_even_when_the_env_still_says_five_seconds(): void
    {
        // 210 notes with photos took longer than the 5 s of the package default on the server (Lettele, ronde 2).
        self::assertGreaterThanOrEqual(120000, config()->integer('laravel-pdf.chrome.operation_timeout'));
        self::assertGreaterThanOrEqual(120000, config()->integer('laravel-pdf.chrome.timeout'));
    }

    public function test_a_current_pdf_is_reused_and_not_rendered_again(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        $callsAfterFirstRun = PrintScenario::renderer()->calls;
        $file = PrintFile::query()->where('part', 'cards')->where('kind', 'part')->firstOrFail();

        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        self::assertSame($callsAfterFirstRun, PrintScenario::renderer()->calls, 'no render, no instruction render');
        self::assertSame($file->cache_key, PrintFile::query()->where('part', 'cards')->where('kind', 'part')->firstOrFail()->cache_key);
        self::assertSame(1, PrintFile::query()->where('part', 'cards')->where('kind', 'part')->count());
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

    public function test_a_busy_job_refuses_a_second_run(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $job->forceFill(['active_at' => CarbonImmutable::now()])->save();

        PrintScenario::generate($this, $job)->assertConflict();
        self::assertSame(0, PrintScenario::renderer()->calls);

        // A run whose worker died stops blocking after a while.
        $job->forceFill(['active_at' => CarbonImmutable::now()->subMinutes(20)])->save();
        PrintScenario::generate($this, $job)->assertOk();
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

    public function test_a_user_has_one_run_at_a_time_over_all_their_jobs(): void
    {
        $user = User::factory()->create();
        $first = PrintScenario::createEditionFor($this, $user);
        $second = PrintScenario::createEditionFor($this, $user);

        $jobOne = PrintScenario::printJobFor($this, $user, $first);
        $jobTwo = PrintScenario::printJobFor($this, $user, $second);

        $jobOne->forceFill(['active_at' => CarbonImmutable::now()])->save();

        PrintScenario::generate($this, $jobTwo)->assertConflict();
    }

    public function test_the_print_page_is_an_inertia_page_with_the_status_and_the_channel(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        $this->get('/nl/print/' . $job->token)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('print/show')
                ->where('job.token', $job->token)
                ->where('job.anonymous', true)
                ->where('job.channel.private', false)
                ->where('job.channel.name', 'print-anon.' . $job->token)
                ->where('job.status.busy', false)
                ->where('edition.name', 'Zaterdagclub')
                ->where('edition.cards', 60)
                ->where('edition.parts', ['board', 'cards', 'money', 'tokens', 'box_lid']));

        // The start page before a job exists.
        $this->get('/en/print')->assertOk()->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->component('print/show')->where('job', null));
    }

    public function test_the_print_page_knows_the_editor_of_its_edition_for_the_way_back(): void
    {
        $response = PrintScenario::postAnonymousJob($this, PrintScenario::editionArray(id: 'zaterdagclub1'));
        $response->assertCreated();

        $token = $response->json('token');
        self::assertIsString($token);

        $this->get('/nl/print/' . $token)
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('localEditionId', 'zaterdagclub1'));
    }

    public function test_a_photo_is_cropped_before_it_reaches_the_page(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();

        // The crop folder is cleaned up after the render.
        self::assertSame([], Storage::disk('local')->allFiles('print-work'));
        self::assertSame(1, Asset::query()->where('print_job_id', $job->publicId())->count());
    }

    /**
     * @param TestResponse<Response> $response
     * @return list<string>
     */
    private function zipNames(TestResponse $response): array
    {
        $path = (string) tempnam(sys_get_temp_dir(), 'zip-test-');
        file_put_contents($path, $response->streamedContent());
        $zip = new ZipArchive();
        self::assertTrue($zip->open($path));
        $names = [];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[] = (string) $zip->getNameIndex($i);
        }

        $zip->close();
        File::delete($path);

        return $names;
    }
}
