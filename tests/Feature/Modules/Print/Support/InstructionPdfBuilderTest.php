<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Integrations\Chrome\Contracts\PdfRenderer;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Support\InstructionPdfBuilder;
use App\Modules\Print\Support\PrintEditionReader;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\FakePdfRenderer;
use Tests\Support\PrintScenario;
use Tests\Support\RealBinary;
use Tests\Support\RecordingPdfRenderer;
use Tests\TestCase;

final class InstructionPdfBuilderTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_instruction_of_a_part_becomes_an_a4_pdf_kept_for_the_retention_time(): void
    {
        $renderer = $this->recordingChrome();
        config(['printopoly.print_files.retention_days' => 5]);
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray()]);

        $file = resolve(InstructionPdfBuilder::class)->ensure($job, PrintPart::Board, Locale::Dutch);

        self::assertSame(PrintFile::KIND_INSTRUCTIONS, $file->kind);
        self::assertSame('board', $file->part);
        self::assertSame('printer', $file->set);
        self::assertSame('instructies-bord.pdf', $file->filename);
        self::assertSame(1, $file->pages);
        self::assertSame('local', $file->disk);
        self::assertSame(1, preg_match('#^print/' . $job->publicId() . '/[0-9a-f]{12}-instructions-printer-board\.pdf$#', $file->path));
        self::assertSame(now()->addDays(5)->toIso8601String(), $file->expires_at->toIso8601String());
        Storage::disk('local')->assertExists($file->path);
        self::assertSame(strlen((string) Storage::disk('local')->get($file->path)), $file->bytes);

        self::assertCount(1, $renderer->calls);
        [$html, $width, $height, $waits] = $renderer->calls[0];
        self::assertSame([210.0, 297.0, false], [$width, $height, $waits]);
        self::assertStringContainsString('<title>Bord</title>', $html);
        self::assertStringContainsString('<h1>Bord</h1>', $html);
        self::assertStringContainsString('248 × 248 mm', $html);
        self::assertStringNotContainsString('Thuisprint-set', $html);
    }

    public function test_the_same_text_is_reused_and_a_changed_text_replaces_the_old_pdf(): void
    {
        $renderer = $this->recordingChrome();
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray()]);
        $builder = resolve(InstructionPdfBuilder::class);

        $first = $builder->ensure($job, PrintPart::Board, Locale::English, PrintSet::Home);
        $again = $builder->ensure($job, PrintPart::Board, Locale::English, PrintSet::Home);

        self::assertSame($first->getKey(), $again->getKey());
        self::assertSame('instructions-board.pdf', $first->filename);
        self::assertCount(1, $renderer->calls);

        $job->choices = ['home' => ['copies' => 2]];
        $job->save();

        $changed = $builder->ensure($job, PrintPart::Board, Locale::English, PrintSet::Home);

        self::assertNotSame($first->getKey(), $changed->getKey());
        self::assertCount(2, $renderer->calls);
        Storage::disk('local')->assertMissing($first->path);
        self::assertSame(1, PrintFile::query()->where('print_job_id', $job->publicId())->count());
    }

    public function test_a_new_release_or_a_lost_file_makes_the_pdf_again(): void
    {
        $renderer = $this->recordingChrome();
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray()]);
        $builder = resolve(InstructionPdfBuilder::class);

        $first = $builder->ensure($job, PrintPart::Tokens, Locale::Dutch);
        Storage::disk('local')->delete($first->path);
        $remade = $builder->ensure($job, PrintPart::Tokens, Locale::Dutch);

        self::assertNotSame($first->getKey(), $remade->getKey());
        self::assertSame($first->cache_key, $remade->cache_key);

        config(['printopoly.print.release' => 'volgende-versie']);
        $released = $builder->ensure($job, PrintPart::Tokens, Locale::Dutch);

        self::assertNotSame($remade->cache_key, $released->cache_key);
        self::assertCount(3, $renderer->calls);
    }

    public function test_a_pdf_that_is_not_a4_is_refused_and_not_kept(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        RealBinary::allow('pdfinfo');
        $renderer = new FakePdfRenderer(resolve(PrintEditionReader::class)->fromArray(PrintScenario::editionArray()));
        $renderer->mode = 'wrong_size';

        app()->instance(PdfRenderer::class, $renderer);
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray()]);

        try {
            resolve(InstructionPdfBuilder::class)->ensure($job, PrintPart::Board, Locale::Dutch);
            self::fail('A PDF that is not A4 should be refused.');
        } catch (PrintFailedException $printFailedException) {
            self::assertSame('Page 1 is 220.50 x 297.00 mm, A4 expected.', $printFailedException->getMessage());
        }

        self::assertSame(0, PrintFile::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_the_test_sheet_text_is_the_same_for_every_edition_and_needs_none(): void
    {
        $job = PrintJob::factory()->create(['edition' => ['name' => 'Kapot', 'elements' => 'geen lijst']]);

        $text = resolve(InstructionPdfBuilder::class)->text($job, PrintPart::Calibration, Locale::Dutch);

        self::assertStringContainsString("# Proefvel\n", $text);
        self::assertStringNotContainsString('## Bestelblad', $text);
    }

    public function test_the_text_of_a_part_follows_the_edition_and_the_sets_of_the_job(): void
    {
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray(), 'choices' => ['printer' => ['copies' => 3]]]);

        $text = resolve(InstructionPdfBuilder::class)->text($job, PrintPart::Board, Locale::Dutch);

        self::assertStringContainsString('Je maakt 3 sets.', $text);
        self::assertStringContainsString('Aantal: 4 stuks, elk 248 × 248 mm.', $text);
        self::assertStringNotContainsString('{', $text);
    }

    public function test_refreshing_a_set_makes_the_instruction_of_every_finished_part_and_the_order_sheet(): void
    {
        $this->recordingChrome();
        $job = PrintJob::factory()->create([
            'edition' => PrintScenario::editionArray(),
            'states' => ['home_board' => ['status' => 'done'], 'home_calibration' => ['status' => 'done'], 'home_cards' => ['status' => 'failed'], 'printer_money' => ['status' => 'done']],
        ]);

        resolve(InstructionPdfBuilder::class)->refreshSet($job, PrintSet::Home, Locale::Dutch);

        $files = PrintFile::query()->where('print_job_id', $job->publicId())->orderBy('part')->get();
        self::assertSame(
            [['instructions', 'board', 'home'], ['instructions', 'calibration', 'home'], ['order_sheet', 'order_sheet', 'home']],
            $files->map(static fn (PrintFile $file): array => [$file->kind, $file->part, $file->set])->all(),
        );
        self::assertSame('bestelblad.pdf', $files[2]?->filename);
    }

    public function test_a_set_with_only_the_test_sheet_gets_no_order_sheet(): void
    {
        $this->recordingChrome();
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray(), 'states' => ['home_calibration' => ['status' => 'done']]]);

        resolve(InstructionPdfBuilder::class)->refreshSet($job, PrintSet::Home, Locale::Dutch);

        self::assertSame(['calibration'], PrintFile::query()->where('print_job_id', $job->publicId())->pluck('part')->all());
    }

    public function test_a_failing_render_while_refreshing_is_reported_and_never_thrown(): void
    {
        Exceptions::fake([RuntimeException::class]);
        $renderer = $this->recordingChrome();
        $renderer->crash = true;

        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray(), 'states' => ['printer_board' => ['status' => 'done']]]);

        resolve(InstructionPdfBuilder::class)->refreshSet($job, PrintSet::Printer, Locale::Dutch);

        Exceptions::assertReportedCount(2);
        Exceptions::assertReported(static fn (RuntimeException $exception): bool => $exception->getMessage() === 'Chrome crashed.');
        self::assertSame(0, PrintFile::query()->count());
    }

    public function test_the_order_sheet_is_current_only_while_the_set_still_holds_what_it_lists(): void
    {
        $this->recordingChrome();
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray(), 'locale' => 'en', 'states' => ['printer_board' => ['status' => 'done'], 'printer_cards' => ['status' => 'done']]]);
        $builder = resolve(InstructionPdfBuilder::class);

        self::assertNull($builder->currentOrderSheet($job, PrintSet::Printer, Locale::English));

        $sheet = $builder->ensureOrderSheet($job, PrintSet::Printer, Locale::English);

        self::assertSame('order-sheet.pdf', $sheet->filename);
        self::assertSame(PrintFile::KIND_ORDER_SHEET, $sheet->kind);
        $current = resolve(InstructionPdfBuilder::class)->currentOrderSheet($job, PrintSet::Printer, Locale::English);
        self::assertInstanceOf(PrintFile::class, $current);
        self::assertSame($sheet->getKey(), $current->getKey());

        $job->choices = ['printer' => ['skipped' => ['cards']]];
        $job->save();

        self::assertNull($builder->currentOrderSheet($job, PrintSet::Printer, Locale::English));
    }

    public function test_an_order_sheet_whose_file_is_gone_or_whose_edition_is_gone_is_not_current(): void
    {
        $this->recordingChrome();
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray(), 'states' => ['home_board' => ['status' => 'done']]]);
        $builder = resolve(InstructionPdfBuilder::class);
        $sheet = $builder->ensureOrderSheet($job, PrintSet::Home, Locale::Dutch);

        Storage::disk('local')->delete($sheet->path);
        self::assertNull($builder->currentOrderSheet($job, PrintSet::Home, Locale::Dutch));

        $job->edition = ['name' => 'Kapot', 'elements' => 'geen lijst'];
        $job->save();
        self::assertNull($builder->currentOrderSheet($job, PrintSet::Home, Locale::Dutch));
    }

    private function recordingChrome(): RecordingPdfRenderer
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        RealBinary::allow('pdfinfo');
        $renderer = new RecordingPdfRenderer();
        app()->instance(PdfRenderer::class, $renderer);

        return $renderer;
    }
}
