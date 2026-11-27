<?php

declare(strict_types=1);

namespace Tests\Feature\Integrations\Poppler;

use App\Integrations\Poppler\PdfRasterizer;
use App\Modules\Print\Exceptions\PrintFailedException;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Tests\Support\RealBinary;
use Tests\Support\TestPdf;
use Tests\TestCase;

final class PdfRasterizerTest extends TestCase
{
    public function test_the_card_is_cut_out_of_the_page_as_a_png_1080_pixels_wide(): void
    {
        RealBinary::allow('pdftoppm');
        $pdf = $this->pdfFile();

        $image = resolve(PdfRasterizer::class)->cropToPng($pdf, 210.0, 5.0, 5.0, 100.0, 150.0);
        File::delete($pdf);

        self::assertSame(1080, $image['width']);
        self::assertSame(1620, $image['height']);
        $size = getimagesizefromstring($image['png']);
        self::assertIsArray($size);
        self::assertSame([1080, 1620, IMAGETYPE_PNG], [$size[0], $size[1], $size[2]]);
        Process::assertRan(static fn (PendingProcess $process): bool => $process->command === [
            'pdftoppm', '-png', '-singlefile', '-f', '1', '-l', '1',
            '-scale-to-x', '2268', '-scale-to-y', '-1',
            '-x', '54', '-y', '54', '-W', '1080', '-H', '1620',
            $pdf, self::prefixOf($process),
        ]);
        self::assertSame([], $this->leftovers());
    }

    public function test_a_failing_pdftoppm_fails_the_print_with_its_error_and_leaves_no_files(): void
    {
        Process::fake(["'pdftoppm' *" => Process::result('', "Syntax Error: broken PDF\n", 1)]);

        try {
            resolve(PdfRasterizer::class)->cropToPng('/tmp/geen.pdf', 210.0, 0.0, 0.0, 105.0, 148.5);
            self::fail('The PNG should not be made.');
        } catch (PrintFailedException $printFailedException) {
            self::assertSame('pdftoppm could not make the PNG: Syntax Error: broken PDF', $printFailedException->getMessage());
        }

        self::assertSame([], $this->leftovers());
    }

    public function test_a_run_that_writes_no_png_fails_the_print(): void
    {
        Process::fake(["'pdftoppm' *" => Process::result()]);

        $this->expectException(PrintFailedException::class);
        $this->expectExceptionMessage('pdftoppm could not make the PNG: ');

        resolve(PdfRasterizer::class)->cropToPng('/tmp/geen.pdf', 210.0, 0.0, 0.0, 105.0, 148.5);
    }

    private function pdfFile(): string
    {
        $path = sys_get_temp_dir() . '/rasterizer-test-' . getmypid() . '.pdf';
        file_put_contents($path, TestPdf::make([[210.0, 297.0]]));

        return $path;
    }

    private static function prefixOf(PendingProcess $process): string
    {
        $command = $process->command;

        return is_array($command) ? (string) end($command) : '';
    }

    /**
     * @return list<string>
     */
    private function leftovers(): array
    {
        $found = glob(sys_get_temp_dir() . '/printopoly-png-*');

        return $found === false ? [] : $found;
    }
}
