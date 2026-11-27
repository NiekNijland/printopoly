<?php

declare(strict_types=1);

namespace Tests\Smoke;

use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintPartBuilder;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Process;
use Override;
use PHPUnit\Framework\Attributes\Group;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\ChromeRender;

/**
 * Renders with the real headless Chrome and the real Vite build of the print page, then checks the PDF with the real
 * `pdfinfo`. Part of the smoke suite: it needs the Chrome of the Sail image (or the LARAVEL_PDF_CHROME_BINARY path), a
 * built `public/build` and the booted app on PRINTOPOLY_RENDER_BASE_URL, and fails when one is missing. Run
 * `sail npm run build` first. It works in a database of its own, which it empties before every test.
 *
 * It uses no photos: the crop route reads the job from the database of the booted app, which is not this database.
 */
#[Group('smoke')]
#[Group('chrome')]
final class ChromeRenderTest extends TestCase
{
    use RefreshesMongoDatabase;

    #[Override]
    public function createApplication(): Application
    {
        return ChromeRender::application();
    }

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        ChromeRender::prepare();
        $this->withVite();
    }

    public function test_chrome_renders_the_print_page_to_pdfs_of_the_planned_size_and_page_count(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => []],
            'locale' => 'nl',
        ]);
        $job->save();

        $builder = resolve(PrintPartBuilder::class);

        // 60 cards, a front and a back each: 120 pages of 81 x 106 mm (63 x 88 plus 3 mm bleed and 6 mm for the
        // crop marks, B160), with a TrimBox on the card and a BleedBox on the bleed.
        $cards = $builder->build($job, PrintSet::PRINTER, PrintPart::CARDS);
        self::assertSame(120, $cards->pages);
        ChromeRender::assertPdf($cards, 120, 81.0, 106.0);
        $boxes = Process::run(['pdfinfo', '-box', '-f', '1', '-l', '1', ChromeRender::localPath($cards)])->output();
        // Exactly 63 × 88 mm (178.58 × 249.45 pt), whatever Chrome rounded the page to (bug 40 of round 4).
        $box = static function (string $name) use ($boxes): array {
            self::assertSame(1, preg_match('/' . $name . ':\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/', $boxes, $match));

            return array_map(floatval(...), array_slice($match, 1, 4));
        };
        [$trimLeft, $trimBottom, $trimRight, $trimTop] = $box('TrimBox') + [0.0, 0.0, 0.0, 0.0];
        self::assertEqualsWithDelta(25.51, $trimLeft, 0.02);
        self::assertEqualsWithDelta(178.58, $trimRight - $trimLeft, 0.02);
        self::assertEqualsWithDelta(249.45, $trimTop - $trimBottom, 0.02);
        [$bleedLeft, , $bleedRight] = $box('BleedBox') + [0.0, 0.0, 0.0, 0.0];
        self::assertEqualsWithDelta(17.01, $bleedLeft, 0.02);
        self::assertEqualsWithDelta(195.59, $bleedRight - $bleedLeft, 0.02);

        // The home sheets (B134): the alignment test, then 7 A4 portrait sheets of 9 cards, fronts and mirrored backs.
        $home = $builder->build($job, PrintSet::HOME, PrintPart::CARDS);
        ChromeRender::assertPdf($home, 16, 210.0, 297.0);

        // The test sheet on A4 portrait.
        $calibration = $builder->build($job, PrintSet::HOME, PrintPart::CALIBRATION);
        ChromeRender::assertPdf($calibration, 1, 210.0, 297.0);

        // The instruction PDF text reaches the PDF.
        self::assertGreaterThan(1000, $cards->bytes);
    }

    public function test_the_board_panels_print_at_full_scale_with_the_self_hosted_fonts(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => []],
            'locale' => 'nl',
        ]);
        $job->save();

        $file = resolve(PrintPartBuilder::class)->build($job, PrintSet::PRINTER, PrintPart::BOARD);
        ChromeRender::assertPdf($file, 4, 266.0, 266.0);
        $path = ChromeRender::localPath($file);

        // Chrome shrinks a whole document when anything lies completely outside its page, which made every
        // panel print at two thirds. The name of a street on the top row must sit where the geometry puts it; the
        // corners write on the diagonal since B266, so a street is the anchor now.
        $words = (string) shell_exec('pdftotext -bbox -f 1 -l 1 ' . escapeshellarg($path) . ' - 2>/dev/null');
        self::assertSame(1, preg_match('/xMin="([\d.]+)"[^>]*>WATERSTRAAT</', $words, $found));
        self::assertEqualsWithDelta(162.9, (float) ($found[1] ?? 0), 2.0);

        // Station West sits on the fold of panel B. Chrome used to fragment a turned space that crosses the
        // bottom of its page and draw it about 50 pt out of its place.
        $second = (string) shell_exec('pdftotext -bbox -f 2 -l 2 ' . escapeshellarg($path) . ' - 2>/dev/null');
        self::assertSame(1, preg_match('/xMin="([\d.]+)"[^>]*>WEST</', $second, $west));
        self::assertEqualsWithDelta(550.3, (float) ($west[1] ?? 0), 8.0);

        $fonts = (string) shell_exec('pdffonts ' . escapeshellarg($path) . ' 2>/dev/null');
        self::assertStringContainsString('LeagueSpartan', $fonts);
        self::assertStringContainsString('InstrumentSans', $fonts);
    }

    public function test_the_extra_print_items_render_at_their_planned_sizes_and_the_invitation_gets_a_png(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => [
                'name' => 'Chrome',
                'language' => 'en',
                'parts' => ['rulesBooklet' => true, 'invitation' => true],
                'elements' => ['invitation' => ['text' => 'Saturday 6 December']],
            ],
            'locale' => 'en',
        ]);
        $job->save();

        $builder = resolve(PrintPartBuilder::class);

        ChromeRender::assertPdf($builder->build($job, PrintSet::PRINTER, PrintPart::RULES_BOOKLET), 16, 166.0, 228.0);
        ChromeRender::assertPdf($builder->build($job, PrintSet::HOME, PrintPart::RULES_BOOKLET), 8, 297.0, 210.0);

        $invitation = $builder->build($job, PrintSet::PRINTER, PrintPart::INVITATION);
        ChromeRender::assertPdf($invitation, 1, 123.0, 166.0);
        ChromeRender::assertPdf($builder->build($job, PrintSet::HOME, PrintPart::INVITATION), 1, 210.0, 297.0);

        $image = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_IMAGE)
            ->where('set', PrintSet::PRINTER->value)
            ->first();
        self::assertInstanceOf(PrintFile::class, $image);
        $size = getimagesize(ChromeRender::localPath($image));
        self::assertSame([1080, 1522], [$size[0] ?? 0, $size[1] ?? 0]);

        $text = (string) shell_exec('pdftotext -f 1 -l 1 ' . escapeshellarg(ChromeRender::localPath($invitation)) . ' - 2>/dev/null');
        self::assertStringContainsString('You are invited', $text);
        self::assertStringContainsString('Saturday 6 December', $text);
    }
}
