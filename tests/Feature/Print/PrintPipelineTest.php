<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Print\OrderSheetText;
use App\Print\PrintProgress;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Response;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;
use ZipArchive;

final class PrintPipelineTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    #[Test]
    public function an_anonymous_job_makes_the_print_shop_set_end_to_end(): void
    {
        $job = $this->createAnonymousJob();

        $response = $this->generate($job, 'printer', ['board', 'cards', 'money', 'tokens', 'box_lid']);
        $response->assertOk()->assertJsonPath('busy', false);

        foreach ([PrintPart::Board, PrintPart::Cards, PrintPart::Money, PrintPart::Tokens, PrintPart::BoxLid] as $part) {
            self::assertSame('done', $this->partStatus($job, PrintSet::Printer, $part), $part->value);
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

    #[Test]
    public function the_zip_holds_the_pdfs_and_the_instructions_and_never_the_test_sheet(): void
    {
        $job = $this->createAnonymousJob();
        $this->generate($job, 'printer', ['board', 'cards'])->assertOk();
        $this->generate($job, 'home', ['calibration'])->assertOk();

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
        unlink($path);

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

    #[Test]
    public function a_part_taken_out_of_the_set_after_it_was_made_leaves_the_zip_and_the_order_sheet(): void
    {
        // B210: the print page chooses what goes in the set, also after the PDFs are made.
        $job = $this->createAnonymousJob();
        $this->generate($job, 'printer', ['board', 'cards'])->assertOk();

        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'printer', 'skipped' => ['cards']])->assertOk();

        self::assertSame([
            'zaterdagclub-00-bestelblad.pdf',
            'zaterdagclub-01-bord.pdf',
            'instructies/01-bord.pdf',
        ], $this->zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()));
        $sheet = app(OrderSheetText::class)->text($job->refresh(), PrintSet::Printer, Locale::Dutch);
        self::assertStringContainsString('zaterdagclub-01-bord.pdf', $sheet);
        self::assertStringNotContainsString('kaarten-en-eigendomsbewijzen.pdf', $sheet);
    }

    #[Test]
    public function the_instructions_and_file_names_follow_the_site_not_the_edition(): void
    {
        // A Dutch edition, printed from the English site (B184, bug 10 of test round 4).
        $response = $this->post('/api/print-jobs', [
            'edition' => json_encode($this->editionArray('Familie De Vries'), JSON_THROW_ON_ERROR),
            'photos' => [self::PHOTO_REF => $this->photoUpload()],
            'locale' => 'en',
        ], ['Accept' => 'application/json'])->assertCreated();
        self::assertStringContainsString('/en/print/', $this->jsonString($response, 'url'));
        $job = PrintJob::query()->where('token', $response->json('token'))->firstOrFail();

        $this->generate($job, 'printer', ['board'])->assertOk();

        $this->get('/api/print/' . $job->token . '/files/printer/board')->assertDownload('familie-de-vries-board-print-shop.pdf');
        $this->get('/api/print/' . $job->token . '/instructions/board?set=printer')->assertDownload('familie-de-vries-instructions-board.pdf');
        self::assertStringContainsString('<title>Board</title>', implode('', $this->renderer->htmls));

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
    #[Test]
    public function a_new_job_takes_over_the_pdfs_that_did_not_change(): void
    {
        $first = $this->createAnonymousJob();
        $this->generate($first, 'printer', ['board', 'money'])->assertOk();

        // The edition changed one card: the board and the money stay the same.
        $changed = $this->editionArray();
        $elements = is_array($changed['elements'] ?? null) ? $changed['elements'] : [];
        $elements['card.chance.01'] = ['text' => 'Ga terug naar start'];
        $changed['elements'] = $elements;
        $response = $this->post('/api/print-jobs', [
            'edition' => json_encode($changed, JSON_THROW_ON_ERROR),
            'photos' => [self::PHOTO_REF => $this->photoUpload()],
            'previous' => $first->token,
        ], ['Accept' => 'application/json'])->assertCreated();
        $second = PrintJob::query()->where('token', $response->json('token'))->firstOrFail();
        $parts = fn (): int => count(array_filter($this->renderer->htmls, static fn (string $html): bool => str_contains($html, 'data-part=')));
        $before = $parts();

        $this->generate($second, 'printer', ['board', 'money'])->assertOk();

        self::assertSame($before, $parts(), 'no PDF of a part was rendered again');
        self::assertSame('done', $this->partStatus($second, PrintSet::Printer, PrintPart::Money));
        $this->get('/api/print/' . $second->token . '/files/printer/money')->assertOk();

        // A token of a job of an account never counts.
        $this->post('/api/print-jobs', [
            'edition' => json_encode($changed, JSON_THROW_ON_ERROR),
            'photos' => [self::PHOTO_REF => $this->photoUpload()],
            'previous' => 'no-such-token',
        ], ['Accept' => 'application/json'])->assertCreated();
        self::assertNull(PrintJob::query()->where('token', '!=', $first->token)->where('token', '!=', $second->token)->firstOrFail()->previous_job_id);
    }

    #[Test]
    public function the_order_sheet_lists_what_the_set_holds_with_the_exact_specs(): void
    {
        $job = $this->createAnonymousJob();
        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'printer', 'copies' => 3])->assertOk();
        $this->generate($job, 'printer', ['board', 'cards', 'money'])->assertOk();

        PrintFile::query()->where('kind', PrintFile::KIND_ORDER_SHEET)->where('set', 'printer')->firstOrFail();
        $sheets = array_values(array_filter($this->renderer->htmls, static fn (string $html): bool => str_contains($html, '<title>Bestelblad</title>')));
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
    }

    #[Test]
    public function the_zip_waits_until_everything_requested_is_done(): void
    {
        $job = $this->createAnonymousJob();

        $this->get('/api/print/' . $job->token . '/zip/printer')->assertStatus(409);

        $this->renderer->mode = 'wrong_size';
        $this->generate($job, 'printer', ['board'])->assertOk();

        $this->get('/api/print/' . $job->token . '/zip/printer')->assertStatus(409);
    }

    #[Test]
    public function the_zip_is_not_offered_while_the_run_still_makes_the_order_sheet(): void
    {
        // R5-25 (Emma): the last part was done, the order sheet not yet, and the ZIP went without it.
        $job = $this->createAnonymousJob();
        $this->generate($job, 'printer', ['board'])->assertOk();
        $sheet = PrintFile::query()->where('kind', PrintFile::KIND_ORDER_SHEET)->where('set', 'printer')->firstOrFail();
        Storage::disk($sheet->disk)->delete($sheet->path);
        $sheet->delete();

        app(PrintProgress::class)->setActive($job, true);
        self::assertFalse($this->getJson('/api/print/' . $job->token . '/status')->json('printerZipReady'));

        app(PrintProgress::class)->setActive($job, false);
        self::assertTrue($this->getJson('/api/print/' . $job->token . '/status')->json('printerZipReady'));
    }

    #[Test]
    public function the_zip_makes_an_order_sheet_that_is_not_there_yet(): void
    {
        // Right after the choices changed the queue has not made the new sheet yet: the ZIP still has one (R5-25).
        $job = $this->createAnonymousJob();
        $this->generate($job, 'printer', ['board', 'cards'])->assertOk();
        PrintFile::query()->where('kind', PrintFile::KIND_ORDER_SHEET)->delete();

        self::assertSame([
            'zaterdagclub-00-bestelblad.pdf',
            'zaterdagclub-01-bord.pdf',
            'zaterdagclub-02-kaarten-en-eigendomsbewijzen.pdf',
            'instructies/01-bord.pdf',
            'instructies/02-kaarten-en-eigendomsbewijzen.pdf',
        ], $this->zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()));
    }

    #[Test]
    public function nothing_is_made_before_the_user_asks(): void
    {
        $job = $this->createAnonymousJob();

        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();

        self::assertSame(0, $this->renderer->calls);
        self::assertSame(0, PrintFile::query()->count());
        foreach ($this->jsonRows($status, 'parts') as $part) {
            self::assertSame('idle', $part['status']);
        }
    }

    #[Test]
    public function only_the_chosen_parts_are_made(): void
    {
        $job = $this->createAnonymousJob();

        $this->generate($job, 'printer', ['cards'])->assertOk();

        self::assertSame('done', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));
        self::assertSame('idle', $this->partStatus($job, PrintSet::Printer, PrintPart::Board));
        self::assertSame('idle', $this->partStatus($job, PrintSet::Printer, PrintPart::Money));
    }

    #[Test]
    public function the_html_has_the_vite_entry_the_edition_as_json_and_a_signed_crop_per_photo(): void
    {
        $job = $this->createAnonymousJob();
        $this->generate($job, 'printer', ['board'])->assertOk();

        $html = $this->renderer->htmls[0];

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

    #[Test]
    public function a_part_that_fails_the_pdf_check_is_marked_failed_and_the_others_go_on(): void
    {
        $job = $this->createAnonymousJob();

        $this->renderer->mode = 'wrong_size';
        $this->generate($job, 'printer', ['board', 'cards'])->assertOk();

        self::assertSame('failed', $this->partStatus($job, PrintSet::Printer, PrintPart::Board));
        self::assertSame('failed', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));
        self::assertSame(0, PrintFile::query()->where('kind', 'part')->count(), 'a failed PDF is never stored');

        $this->get('/api/print/' . $job->token . '/files/printer/board')->assertNotFound();
    }

    #[Test]
    public function a_wrong_page_count_fails_the_part_and_retry_makes_it(): void
    {
        $job = $this->createAnonymousJob();

        $this->renderer->mode = 'wrong_count';
        $this->generate($job, 'printer', ['cards'])->assertOk();
        self::assertSame('failed', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));

        $this->renderer->mode = 'ok';
        $this->generate($job, 'printer', ['cards'])->assertOk();
        self::assertSame('done', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));
    }

    #[Test]
    public function a_crashing_renderer_fails_only_its_part(): void
    {
        $job = $this->createAnonymousJob();

        $this->renderer->mode = 'crash';
        $this->generate($job, 'printer', ['board'])->assertOk();

        self::assertSame('failed', $this->partStatus($job, PrintSet::Printer, PrintPart::Board));
        self::assertFalse($job->fresh()?->isBusy(), 'a crash does not leave the job busy');
    }

    #[Test]
    public function the_instructions_of_a_set_leave_out_the_other_set(): void
    {
        $job = $this->createAnonymousJob();

        $this->generate($job, 'home', ['board'])->assertOk();
        $home = collect($this->renderer->htmls)->last(fn (string $html): bool => str_contains($html, '<title>Bord</title>'));
        self::assertIsString($home);
        self::assertStringContainsString('Thuisprint-set', $home);
        self::assertStringNotContainsString('Drukkerij-set', $home);

        $this->generate($job, 'printer', ['board'])->assertOk();
        $printer = collect($this->renderer->htmls)->last(fn (string $html): bool => str_contains($html, '<title>Bord</title>'));
        self::assertIsString($printer);
        self::assertStringContainsString('Drukkerij-set', $printer);
        self::assertStringNotContainsString('Thuisprint-set', $printer);

        $url = $this->partRow($job, PrintSet::Home, PrintPart::Board)['instructionsUrl'];
        self::assertIsString($url);
        $this->get($url)->assertOk();
    }

    #[Test]
    public function a_failed_part_says_why(): void
    {
        $job = $this->createAnonymousJob();

        $this->renderer->mode = 'timeout';
        $this->generate($job, 'printer', ['board'])->assertOk();
        self::assertSame('timeout', $this->partRow($job, PrintSet::Printer, PrintPart::Board)['reason']);

        $this->renderer->mode = 'wrong_count';
        $this->generate($job, 'printer', ['cards'])->assertOk();
        self::assertSame('layout', $this->partRow($job, PrintSet::Printer, PrintPart::Cards)['reason']);

        $this->renderer->mode = 'crash';
        $this->generate($job, 'printer', ['board'])->assertOk();
        self::assertSame('other', $this->partRow($job, PrintSet::Printer, PrintPart::Board)['reason']);

        $this->renderer->mode = 'ok';
        $this->generate($job, 'printer', ['board'])->assertOk();
        self::assertNull($this->partRow($job, PrintSet::Printer, PrintPart::Board)['reason'], 'a part that is done has no reason');
    }

    #[Test]
    public function chrome_gets_two_minutes_to_print_a_sheet_even_when_the_env_still_says_five_seconds(): void
    {
        // 210 notes with photos took longer than the 5 s of the package default on the server (Lettele, ronde 2).
        self::assertGreaterThanOrEqual(120000, config()->integer('laravel-pdf.chrome.operation_timeout'));
        self::assertGreaterThanOrEqual(120000, config()->integer('laravel-pdf.chrome.timeout'));
    }

    #[Test]
    public function a_current_pdf_is_reused_and_not_rendered_again(): void
    {
        $job = $this->createAnonymousJob();

        $this->generate($job, 'printer', ['cards'])->assertOk();
        $callsAfterFirstRun = $this->renderer->calls;
        $file = PrintFile::query()->where('part', 'cards')->where('kind', 'part')->firstOrFail();

        $this->generate($job, 'printer', ['cards'])->assertOk();

        self::assertSame($callsAfterFirstRun, $this->renderer->calls, 'no render, no instruction render');
        self::assertSame($file->cache_key, PrintFile::query()->where('part', 'cards')->where('kind', 'part')->firstOrFail()->cache_key);
        self::assertSame(1, PrintFile::query()->where('part', 'cards')->where('kind', 'part')->count());
    }

    #[Test]
    public function the_status_follows_the_cache_key_when_the_edition_of_an_account_changes(): void
    {
        $user = $this->createUser();
        $edition = $this->createEditionFor($user);

        $job = $this->printJobFor($user, $edition);

        $this->generate($job, 'printer', ['cards', 'money'])->assertOk();
        self::assertSame('done', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));

        // Another part changes: cards stay current, money goes stale.
        $edition->forceFill(['elements' => [...$edition->elements, 'note.5' => ['color' => '#AA3322']]])->save();

        self::assertSame('done', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));
        self::assertSame('outdated', $this->partStatus($job, PrintSet::Printer, PrintPart::Money));

        $this->get('/api/print/' . $job->token . '/zip/printer')->assertStatus(409);

        // A new release makes everything outdated (B62).
        config(['printopoly.print.release' => 'v2']);
        self::assertSame('outdated', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));

        $this->generate($job, 'printer', ['cards', 'money'])->assertOk();
        self::assertSame('done', $this->partStatus($job, PrintSet::Printer, PrintPart::Money));
    }

    #[Test]
    public function a_pdf_past_its_seven_days_reads_as_outdated(): void
    {
        $job = $this->createAnonymousJob();
        $this->generate($job, 'printer', ['cards'])->assertOk();

        $file = PrintFile::query()->where('part', 'cards')->where('kind', 'part')->firstOrFail();
        $file->forceFill(['expires_at' => CarbonImmutable::now()->subMinute()])->save();

        self::assertSame('outdated', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));
    }

    #[Test]
    public function the_waiting_parts_say_what_they_wait_for(): void
    {
        $job = $this->createAnonymousJob();
        $job->forceFill(['states' => ['printer_board' => ['status' => 'running', 'cache_key' => null, 'error' => null, 'after' => null], 'printer_cards' => ['status' => 'waiting', 'cache_key' => null, 'error' => null, 'after' => 'board']], 'active_at' => CarbonImmutable::now()])->save();

        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();

        self::assertTrue($status->json('busy'));
        $cards = $this->partRow($job, PrintSet::Printer, PrintPart::Cards);
        self::assertSame(['waiting', 'board'], [$cards['status'], $cards['waitingFor']]);
    }

    #[Test]
    public function a_busy_job_refuses_a_second_run(): void
    {
        $job = $this->createAnonymousJob();
        $job->forceFill(['active_at' => CarbonImmutable::now()])->save();

        $this->generate($job)->assertStatus(409);
        self::assertSame(0, $this->renderer->calls);

        // A run whose worker died stops blocking after a while.
        $job->forceFill(['active_at' => CarbonImmutable::now()->subMinutes(20)])->save();
        $this->generate($job)->assertOk();
    }

    #[Test]
    public function a_run_whose_worker_died_reads_as_failed_after_the_timeout_and_retry_restarts_it(): void
    {
        $job = $this->createAnonymousJob();
        $states = ['printer_cards' => ['status' => 'running', 'cache_key' => null, 'error' => null, 'after' => null]];

        // Fresh: still busy, nothing to retry yet.
        $job->forceFill(['states' => $states, 'active_at' => CarbonImmutable::now()->subMinutes(2)])->save();
        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();
        self::assertTrue($status->json('busy'));
        self::assertSame('running', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));

        // Past the timeout: failed, the page offers "Opnieuw proberen", and that starts a new run.
        $job->forceFill(['active_at' => CarbonImmutable::now()->subMinutes(PrintProgress::STALE_AFTER_MINUTES + 1)])->save();
        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();
        self::assertFalse($status->json('busy'));
        self::assertSame('failed', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));

        $this->generate($job, 'printer', ['cards'])->assertOk();
        self::assertSame('done', $this->partStatus($job, PrintSet::Printer, PrintPart::Cards));
    }

    #[Test]
    public function a_user_has_one_run_at_a_time_over_all_their_jobs(): void
    {
        $user = $this->createUser();
        $first = $this->createEditionFor($user);
        $second = $this->createEditionFor($user);

        $jobOne = $this->printJobFor($user, $first);
        $jobTwo = $this->printJobFor($user, $second);

        $jobOne->forceFill(['active_at' => CarbonImmutable::now()])->save();

        $this->generate($jobTwo)->assertStatus(409);
    }

    #[Test]
    public function the_print_page_is_an_inertia_page_with_the_status_and_the_channel(): void
    {
        $job = $this->createAnonymousJob();

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

    #[Test]
    public function the_print_page_knows_the_editor_of_its_edition_for_the_way_back(): void
    {
        $response = $this->postAnonymousJob($this->editionArray(id: 'zaterdagclub1'));
        $response->assertCreated();

        $token = $response->json('token');
        self::assertIsString($token);

        $this->get('/nl/print/' . $token)
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('localEditionId', 'zaterdagclub1'));
    }

    #[Test]
    public function a_photo_is_cropped_before_it_reaches_the_page(): void
    {
        $job = $this->createAnonymousJob();
        $this->generate($job, 'printer', ['board'])->assertOk();

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
        unlink($path);

        return $names;
    }
}
