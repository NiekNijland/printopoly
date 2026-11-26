<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\OrderSheetText;
use Illuminate\Support\Facades\File;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;
use ZipArchive;

final class PrintZipTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

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
        ], PrintScenario::zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()));
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
        $names = PrintScenario::zipNames($this->get('/api/print/' . $job->token . '/zip/printer')->assertOk()->assertDownload('familie-de-vries-drukkerij-set.zip'));
        self::assertContains('instructies/01-bord.pdf', $names);
        self::assertContains('familie-de-vries-00-bestelblad.pdf', $names);
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
}
