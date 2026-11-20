<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Print\PdfInspector;
use App\Print\PdfRenderer;
use App\Print\PrintPartBuilder;
use Illuminate\Support\Facades\Storage;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * Renders with the real headless Chrome and the real Vite build of the print page, then
 * checks the PDF with the real `pdfinfo`. It needs the Chrome of the Sail image (or the
 * LARAVEL_PDF_CHROME_BINARY path), a built `public/build` and the app on port 80 (the Sail
 * dev server): otherwise it skips. Run `sail npm run build` first.
 *
 * It uses no photos: the crop route reads the job from the database of the dev server,
 * which is not the test database.
 */
final class ChromeRenderTest extends TestCase
{
    use RefreshesMongoDatabase;

    private const string SAIL_CHROME = '/usr/local/bin/chrome-headless-shell';

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $binary = $this->chromeBinary();
        $manifest = public_path('build/manifest.json');

        if ($binary === null) {
            $this->markTestSkipped('No headless Chrome here (set LARAVEL_PDF_CHROME_BINARY).');
        }

        if (! is_file($manifest) || ! str_contains((string) file_get_contents($manifest), 'resources/js/print.tsx')) {
            $this->markTestSkipped('The print page is not built: run `npm run build`.');
        }

        if (! $this->appIsReachable()) {
            $this->markTestSkipped('The app does not answer on ' . config()->string('printopoly.print.render_base_url') . ' (is Sail running?).');
        }

        $this->withVite();
        Storage::fake('local');
        config([
            'printopoly.storage.disk' => 'local',
            'laravel-pdf.driver' => 'chrome',
            'laravel-pdf.chrome.chrome_binary' => $binary,
            'laravel-pdf.chrome.no_sandbox' => true,
            'printopoly.print.ready_timeout_ms' => 30000,
        ]);
        app()->forgetInstance(PdfRenderer::class);
    }

    #[Test]
    public function chrome_renders_the_print_page_to_pdfs_of_the_planned_size_and_page_count(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => []],
            'locale' => 'nl',
        ]);
        $job->save();

        $builder = app(PrintPartBuilder::class);

        // 60 cards, a front and a back each: 120 pages of 69 x 94 mm (63 x 88 plus 3 mm bleed).
        $cards = $builder->build($job, PrintSet::Printer, PrintPart::Cards);
        self::assertSame(120, $cards->pages);
        $this->assertPdf($cards, 120, 69.0, 94.0);

        // The home sheets: 15 A4 landscape pages with 4 fold cards each and crop marks.
        $home = $builder->build($job, PrintSet::Home, PrintPart::Cards);
        $this->assertPdf($home, 15, 297.0, 210.0);

        // The test sheet on A4 portrait.
        $calibration = $builder->build($job, PrintSet::Home, PrintPart::Calibration);
        $this->assertPdf($calibration, 1, 210.0, 297.0);

        // The instruction PDF text reaches the PDF.
        self::assertGreaterThan(1000, $cards->bytes);
    }

    #[Test]
    public function the_printed_text_is_in_the_pdf(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => []],
            'locale' => 'nl',
        ]);
        $job->save();

        $file = app(PrintPartBuilder::class)->build($job, PrintSet::Home, PrintPart::Calibration);
        $path = $this->localPath($file);

        $text = (string) shell_exec('pdftotext ' . escapeshellarg($path) . ' - 2>/dev/null');
        self::assertStringContainsString('Proefvel', $text);
        self::assertStringContainsString('Liniaal 100 mm', $text);
    }

    #[Test]
    public function the_board_panels_print_at_full_scale_with_the_self_hosted_fonts(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => []],
            'locale' => 'nl',
        ]);
        $job->save();

        $file = app(PrintPartBuilder::class)->build($job, PrintSet::Printer, PrintPart::Board);
        $this->assertPdf($file, 4, 254.0, 254.0);
        $path = $this->localPath($file);

        // Chrome shrinks a whole document when anything lies completely outside its page, which made every
        // panel print at two thirds. The corner space "Vrij parkeren" must sit where the geometry puts it.
        $words = (string) shell_exec('pdftotext -bbox -f 1 -l 1 ' . escapeshellarg($path) . ' - 2>/dev/null');
        self::assertSame(1, preg_match('/xMin="([\d.]+)"[^>]*>Vrij</', $words, $found));
        self::assertEqualsWithDelta(54.1, (float) ($found[1] ?? 0), 2.0);

        // Station West sits on the fold of panel B. Chrome used to fragment a turned space that crosses the
        // bottom of its page and draw it about 50 pt out of its place.
        $second = (string) shell_exec('pdftotext -bbox -f 2 -l 2 ' . escapeshellarg($path) . ' - 2>/dev/null');
        self::assertSame(1, preg_match('/xMin="([\d.]+)"[^>]*>West</', $second, $west));
        self::assertEqualsWithDelta(533.3, (float) ($west[1] ?? 0), 8.0);

        $fonts = (string) shell_exec('pdffonts ' . escapeshellarg($path) . ' 2>/dev/null');
        self::assertStringContainsString('LeagueSpartan', $fonts);
        self::assertStringContainsString('InstrumentSans', $fonts);
    }

    #[Test]
    public function the_custom_words_of_an_edition_are_in_the_pdfs(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => [
                'name' => 'Raalte',
                'language' => 'nl',
                'currency' => 'eur',
                'parts' => ['deeds' => true, 'cards' => true, 'money' => true],
                'elements' => [
                    'words.house' => ['name' => 'Schuurtje', 'text' => 'Schuurtjes'],
                    'words.hotel' => ['name' => 'Boerderij', 'text' => 'Boerderijen'],
                    'words.jail' => ['name' => 'de Strafbank'],
                    'words.currency' => ['name' => 'Raalter pegels', 'text' => 'RP'],
                    'words.chance' => ['name' => 'Roddel'],
                    'words.chest' => ['name' => 'Dorpskas'],
                    'space.00' => ['name' => 'Begin', 'text' => 'Pak 200 pegels bij de molen'],
                    'space.10' => ['text' => 'In de Strafbank'],
                    'space.20' => ['text' => 'Even uitrusten'],
                    'space.30' => ['name' => 'Naar de Strafbank', 'text' => 'Rechtstreeks'],
                ],
            ],
            'locale' => 'nl',
        ]);
        $job->save();

        $builder = app(PrintPartBuilder::class);
        // Card texts wrap over lines; compare on one line.
        $text = fn (PrintPart $part): string => (string) preg_replace('/\s+/', ' ', (string) shell_exec(
            'pdftotext -raw ' . escapeshellarg($this->localPath($builder->build($job, PrintSet::Printer, $part))) . ' - 2>/dev/null',
        ));

        $board = $text(PrintPart::Board);
        self::assertStringContainsString('Roddel', $board);
        self::assertStringContainsString('Dorpskas', $board);
        self::assertStringContainsString('RP 60', $board);
        self::assertStringContainsString('Pak 200 pegels bij de molen', $board);
        self::assertStringContainsString('Even uitrusten', $board);
        self::assertStringContainsString('Rechtstreeks', $board);
        self::assertStringNotContainsString('Kans', $board);
        self::assertStringNotContainsString('Algemeen Fonds', $board);
        self::assertStringNotContainsString('€', $board);

        $cards = $text(PrintPart::Cards);
        self::assertStringContainsString('Met 3 Schuurtjes', $cards);
        self::assertStringContainsString('Met Boerderij', $cards);
        self::assertStringContainsString('betaal RP 25 per Schuurtje en RP 100 per Boerderij', $cards);
        self::assertStringContainsString('Ga meteen naar de Strafbank', $cards);
        self::assertStringContainsString('Roddel', $cards);
        self::assertStringContainsString('Dorpskas', $cards);
        self::assertStringContainsString('RP 60', $cards);
        self::assertStringNotContainsString('Kans', $cards);
        self::assertStringNotContainsString('huizen', $cards);

        $money = $text(PrintPart::Money);
        self::assertStringContainsString('RP 50', $money);
        self::assertStringContainsString('speelgeld', $money);
        self::assertStringNotContainsString('€', $money);
    }

    #[Test]
    public function the_extra_print_items_render_at_their_planned_sizes_and_the_invitation_gets_a_png(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => [
                'name' => 'Chrome',
                'language' => 'en',
                'parts' => ['rulesBooklet' => true, 'foldModels' => true, 'dice' => true, 'invitation' => true],
                'elements' => ['invitation' => ['text' => 'Saturday 6 December']],
            ],
            'locale' => 'en',
        ]);
        $job->save();
        $builder = app(PrintPartBuilder::class);

        $this->assertPdf($builder->build($job, PrintSet::Printer, PrintPart::RulesBooklet), 16, 154.5, 216.0);
        $this->assertPdf($builder->build($job, PrintSet::Home, PrintPart::RulesBooklet), 8, 297.0, 210.0);
        $this->assertPdf($builder->build($job, PrintSet::Home, PrintPart::FoldModels), 3, 210.0, 297.0);
        $this->assertPdf($builder->build($job, PrintSet::Home, PrintPart::Dice), 1, 210.0, 297.0);

        $invitation = $builder->build($job, PrintSet::Printer, PrintPart::Invitation);
        $this->assertPdf($invitation, 1, 111.0, 154.0);
        $this->assertPdf($builder->build($job, PrintSet::Home, PrintPart::Invitation), 1, 210.0, 297.0);

        $image = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_IMAGE)
            ->where('set', PrintSet::Printer->value)
            ->first();
        self::assertInstanceOf(PrintFile::class, $image);
        $size = getimagesize($this->localPath($image));
        self::assertSame([1080, 1522], [$size[0] ?? 0, $size[1] ?? 0]);

        $text = (string) shell_exec('pdftotext -f 1 -l 1 ' . escapeshellarg($this->localPath($invitation)) . ' - 2>/dev/null');
        self::assertStringContainsString('You are invited', $text);
        self::assertStringContainsString('Saturday 6 December', $text);
    }

    private function assertPdf(PrintFile $file, int $pages, float $width, float $height): void
    {
        $sizes = new PdfInspector()->pages($this->localPath($file));

        self::assertCount($pages, $sizes);

        foreach ($sizes as [$w, $h]) {
            self::assertEqualsWithDelta($width, $w, 0.2);
            self::assertEqualsWithDelta($height, $h, 0.2);
        }
    }

    private function localPath(PrintFile $file): string
    {
        return Storage::disk($file->disk)->path($file->path);
    }

    private function chromeBinary(): ?string
    {
        foreach ([getenv('LARAVEL_PDF_CHROME_BINARY'), self::SAIL_CHROME] as $candidate) {
            if (is_string($candidate) && $candidate !== '' && is_executable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function appIsReachable(): bool
    {
        $base = rtrim(config()->string('printopoly.print.render_base_url'), '/');
        $headers = @get_headers($base . '/up');

        return is_array($headers) && str_contains((string) ($headers[0] ?? ''), '200');
    }
}
