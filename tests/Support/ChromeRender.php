<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Integrations\Chrome\Contracts\PdfRenderer;
use App\Models\PrintFile;
use App\Modules\Print\Support\PdfInspector;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Assert;

final class ChromeRender
{
    private const string SAIL_CHROME = '/usr/local/bin/chrome-headless-shell';

    public static function application(): Application
    {
        $app = require __DIR__ . '/../../bootstrap/app.php';
        Assert::assertInstanceOf(Application::class, $app);
        $app->make(Kernel::class)->bootstrap();
        $app->make(Repository::class)->set('database.connections.mongodb.database', 'printopoly_smoke_render');

        return $app;
    }

    public static function prepare(): void
    {
        $binary = self::chromeBinary();
        $manifest = public_path('build/manifest.json');

        Assert::assertNotNull($binary, 'No headless Chrome here (set LARAVEL_PDF_CHROME_BINARY).');
        Assert::assertFileExists($manifest, 'The print page is not built: run `npm run build`.');
        Assert::assertStringContainsString('resources/js/print.tsx', (string) file_get_contents($manifest), 'The print page is not built: run `npm run build`.');
        Assert::assertTrue(Http::get(rtrim(config()->string('printopoly.print.render_base_url'), '/') . '/up')->ok(), 'The app does not answer on ' . config()->string('printopoly.print.render_base_url') . ' (boot the stack).');

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

    public static function assertPdf(PrintFile $file, int $pages, float $width, float $height): void
    {
        $sizes = new PdfInspector()->pages(self::localPath($file));

        Assert::assertCount($pages, $sizes);

        foreach ($sizes as [$w, $h]) {
            Assert::assertEqualsWithDelta($width, $w, 0.2);
            Assert::assertEqualsWithDelta($height, $h, 0.2);
        }
    }

    public static function localPath(PrintFile $file): string
    {
        return Storage::disk($file->disk)->path($file->path);
    }

    private static function chromeBinary(): ?string
    {
        foreach ([getenv('LARAVEL_PDF_CHROME_BINARY'), self::SAIL_CHROME] as $candidate) {
            if (is_string($candidate) && $candidate !== '' && is_executable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
