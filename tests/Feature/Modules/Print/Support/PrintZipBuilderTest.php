<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Integrations\Chrome\Contracts\PdfRenderer;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Support\InstructionPdfBuilder;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use App\Modules\Print\Support\PrintZipBuilder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\Support\RealBinary;
use Tests\Support\RecordingPdfRenderer;
use Tests\TestCase;
use ZipArchive;

final class PrintZipBuilderTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_zip_holds_the_order_sheet_first_then_the_parts_of_the_set_numbered_with_their_png_and_instructions(): void
    {
        $this->fakeDisk();
        $job = PrintJob::factory()->create([
            'edition' => PrintScenario::editionArray(),
            'states' => ['printer_board' => ['status' => 'done'], 'printer_cards' => ['status' => 'done'], 'printer_invitation' => ['status' => 'done']],
            'choices' => ['printer' => ['skipped' => ['money']]],
        ]);
        resolve(InstructionPdfBuilder::class)->ensureOrderSheet($job, PrintSet::Printer, Locale::Dutch);
        $this->stored($job, PrintFile::KIND_PART, 'invitation', 'printer', 'uitnodiging');
        $this->stored($job, PrintFile::KIND_PART, 'cards', 'printer', 'kaarten');
        $this->stored($job, PrintFile::KIND_PART, 'board', 'printer', 'bord');
        $this->stored($job, PrintFile::KIND_PART, 'money', 'printer', 'geld');
        $this->stored($job, PrintFile::KIND_PART, 'calibration', 'printer', 'proefvel');
        $this->stored($job, PrintFile::KIND_PART, 'board', 'home', 'bord thuis');
        $this->stored($job, PrintFile::KIND_IMAGE, 'invitation', 'printer', 'png');
        $this->stored($job, PrintFile::KIND_IMAGE, 'money', 'printer', 'png geld');
        $this->stored($job, PrintFile::KIND_INSTRUCTIONS, 'cards', 'printer', 'uitleg kaarten');
        $this->stored($job, PrintFile::KIND_INSTRUCTIONS, 'money', 'printer', 'uitleg geld');

        $entries = $this->entries($this->build($job, PrintSet::Printer));

        self::assertSame([
            'zaterdagclub-00-bestelblad.pdf',
            'zaterdagclub-01-bord.pdf',
            'zaterdagclub-02-kaarten-en-eigendomsbewijzen.pdf',
            'zaterdagclub-03-uitnodiging.pdf',
            'zaterdagclub-03-uitnodiging-1080px.png',
            'instructies/02-kaarten-en-eigendomsbewijzen.pdf',
        ], array_keys($entries));
        self::assertSame('bord', $entries['zaterdagclub-01-bord.pdf']);
        self::assertSame('png', $entries['zaterdagclub-03-uitnodiging-1080px.png']);
        self::assertSame('uitleg kaarten', $entries['instructies/02-kaarten-en-eigendomsbewijzen.pdf']);
    }

    public function test_an_order_sheet_that_no_longer_matches_the_set_stays_out(): void
    {
        $this->fakeDisk();
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray(), 'locale' => 'en', 'states' => ['home_board' => ['status' => 'done'], 'home_cards' => ['status' => 'done']]]);
        resolve(InstructionPdfBuilder::class)->ensureOrderSheet($job, PrintSet::Home, Locale::English);
        $this->stored($job, PrintFile::KIND_PART, 'board', 'home', 'board');
        $job->choices = ['home' => ['skipped' => ['cards']]];
        $job->save();

        self::assertSame(['zaterdagclub-01-board.pdf'], array_keys($this->entries($this->build($job, PrintSet::Home))));
    }

    public function test_a_set_without_finished_pdfs_has_nothing_to_zip(): void
    {
        $this->fakeDisk();
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray()]);
        $this->stored($job, PrintFile::KIND_PART, 'calibration', 'home', 'proefvel');
        $this->stored($job, PrintFile::KIND_PART, 'board', 'printer', 'bord');

        $this->expectException(PrintFailedException::class);
        $this->expectExceptionMessage('There is nothing to put in the ZIP.');

        $this->build($job, PrintSet::Home);
    }

    public function test_a_pdf_that_is_gone_from_the_disk_fails_the_zip_and_leaves_no_file(): void
    {
        $this->fakeDisk();
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray()]);
        $file = $this->stored($job, PrintFile::KIND_PART, 'board', 'home', 'bord');
        Storage::disk('local')->delete($file->path);
        $before = $this->temporaryZips();

        try {
            $this->build($job, PrintSet::Home);
            self::fail('The ZIP should fail.');
        } catch (PrintFailedException $printFailedException) {
            self::assertSame('A PDF for the ZIP is missing.', $printFailedException->getMessage());
        }

        self::assertSame($before, $this->temporaryZips());
    }

    private function build(PrintJob $job, PrintSet $set): string
    {
        return resolve(PrintZipBuilder::class)->build($job, $set, PrintFileNames::for($job, resolve(PrintJobContext::class)));
    }

    private function fakeDisk(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        RealBinary::allow('pdfinfo');
        app()->instance(PdfRenderer::class, new RecordingPdfRenderer());
    }

    private function stored(PrintJob $job, string $kind, string $part, string $set, string $contents): PrintFile
    {
        $path = 'print/' . $job->publicId() . '/' . $kind . '-' . $set . '-' . $part;
        Storage::disk('local')->put($path, $contents);

        return PrintFile::factory()->create(['print_job_id' => $job->publicId(), 'kind' => $kind, 'part' => $part, 'set' => $set, 'path' => $path, 'disk' => 'local']);
    }

    /**
     * @return array<string, string>
     */
    private function entries(string $path): array
    {
        $zip = new ZipArchive();
        self::assertTrue($zip->open($path));
        $entries = [];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = (string) $zip->getNameIndex($i);
            $entries[$name] = (string) $zip->getFromIndex($i);
        }

        $zip->close();
        File::delete($path);

        return $entries;
    }

    /**
     * @return list<string>
     */
    private function temporaryZips(): array
    {
        $found = glob(sys_get_temp_dir() . '/printopoly-zip-*');

        return $found === false ? [] : $found;
    }
}
