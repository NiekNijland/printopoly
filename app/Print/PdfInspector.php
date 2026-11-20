<?php

declare(strict_types=1);

namespace App\Print;

use Illuminate\Support\Facades\Process;

/**
 * Reads a PDF back with `pdfinfo` (poppler-utils) and holds it against what it
 * should be (B12, B63): page count exact, page size within ±0.2 mm. Fails hard
 * on any deviation; a wrong scale is only noticed after sticking otherwise.
 */
final class PdfInspector
{
    private const float POINTS_TO_MM = 25.4 / 72;

    /**
     * @return list<array{float, float}> Page sizes in mm, in page order.
     *
     * @throws PrintFailed
     */
    public function pages(string $path): array
    {
        $result = Process::timeout(60)->run(['pdfinfo', '-f', '1', '-l', '100000', $path]);

        if (! $result->successful()) {
            throw new PrintFailed('pdfinfo could not read the PDF: ' . trim($result->errorOutput()));
        }

        preg_match_all('/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/m', $result->output(), $matches, PREG_SET_ORDER);

        $pages = [];
        foreach ($matches as $match) {
            $pages[] = [round((float) $match[1] * self::POINTS_TO_MM, 2), round((float) $match[2] * self::POINTS_TO_MM, 2)];
        }

        return $pages;
    }

    /**
     * @throws PrintFailed
     */
    public function assertMatches(string $path, ExpectedPdf $expected): int
    {
        $pages = $this->pages($path);

        if (($expected->pages === null && $pages === []) || ($expected->pages !== null && count($pages) !== $expected->pages)) {
            throw new PrintFailed(sprintf('The PDF has %d pages, %s expected.', count($pages), $expected->pages ?? 'at least one'));
        }

        $tolerance = config()->float('printopoly.print.size_tolerance_mm');

        foreach ($pages as $index => [$width, $height]) {
            if (abs($width - $expected->widthMm) > $tolerance || abs($height - $expected->heightMm) > $tolerance) {
                throw new PrintFailed(sprintf(
                    'Page %d is %.2f x %.2f mm, %.2f x %.2f mm expected.',
                    $index + 1,
                    $width,
                    $height,
                    $expected->widthMm,
                    $expected->heightMm,
                ));
            }
        }

        return count($pages);
    }

    /**
     * For PDFs without a fixed plan, such as instructions: at least one A4 page.
     *
     * @throws PrintFailed
     */
    public function assertA4(string $path): int
    {
        $pages = $this->pages($path);

        if ($pages === []) {
            throw new PrintFailed('The PDF has no pages.');
        }

        $tolerance = config()->float('printopoly.print.size_tolerance_mm');

        foreach ($pages as $index => [$width, $height]) {
            if (abs($width - 210) > $tolerance || abs($height - 297) > $tolerance) {
                throw new PrintFailed(sprintf('Page %d is %.2f x %.2f mm, A4 expected.', $index + 1, $width, $height));
            }
        }

        return count($pages);
    }
}
