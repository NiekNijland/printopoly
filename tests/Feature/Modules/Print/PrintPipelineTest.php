<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class PrintPipelineTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_an_anonymous_job_makes_the_print_shop_set_end_to_end(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        $response = PrintScenario::generate($this, $job, 'printer', ['board', 'cards', 'money', 'tokens', 'box_lid']);
        $response->assertOk()->assertJsonPath('busy', false);

        foreach ([PrintPart::BOARD, PrintPart::CARDS, PrintPart::MONEY, PrintPart::TOKENS, PrintPart::BOX_LID] as $part) {
            self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, $part), $part->value);
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
        self::assertSame('done', PrintScenario::partStatus($this, $second, PrintSet::PRINTER, PrintPart::MONEY));
        $this->get('/api/print/' . $second->token . '/files/printer/money')->assertOk();

        // A token of a job of an account never counts.
        $this->post('/api/print-jobs', [
            'edition' => json_encode($changed, JSON_THROW_ON_ERROR),
            'photos' => [PrintScenario::PHOTO_REF => PrintScenario::photoUpload()],
            'previous' => 'no-such-token',
        ], ['Accept' => 'application/json'])->assertCreated();
        self::assertNull(PrintJob::query()->whereNotIn('token', [$first->token, $second->token])->firstOrFail()->previous_job_id);
    }

    public function test_only_the_chosen_parts_are_made(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::CARDS));
        self::assertSame('idle', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::BOARD));
        self::assertSame('idle', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::MONEY));
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

        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::BOARD));
        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::CARDS));
        self::assertSame(0, PrintFile::query()->where('kind', 'part')->count(), 'a failed PDF is never stored');

        $this->get('/api/print/' . $job->token . '/files/printer/board')->assertNotFound();
    }

    public function test_a_wrong_page_count_fails_the_part_and_retry_makes_it(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::renderer()->mode = 'wrong_count';
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::CARDS));

        PrintScenario::renderer()->mode = 'ok';
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::CARDS));
    }

    public function test_a_crashing_renderer_fails_only_its_part(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::renderer()->mode = 'crash';
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();

        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::BOARD));
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

        $url = PrintScenario::partRow($this, $job, PrintSet::HOME, PrintPart::BOARD)['instructionsUrl'];
        self::assertIsString($url);
        $this->get($url)->assertOk();
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
}
