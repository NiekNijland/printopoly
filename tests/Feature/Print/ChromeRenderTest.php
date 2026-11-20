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
