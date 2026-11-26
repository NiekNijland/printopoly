<?php

declare(strict_types=1);

namespace App\Print;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

/**
 * Makes the PNG of the invitation to send digitally (B123) from the finished
 * PDF, with `pdftoppm` (poppler-utils, the same package as `pdfinfo`). The PNG
 * is cropped to the finished card: the bleed of the print shop PDF, or the
 * other three cards of the home sheet, are not in it.
 */
final class PdfRasterizer
{
    public const int PNG_WIDTH = 1080;

    /**
     * @param float $pageWidthMm Width of the PDF page.
     * @param float $cropX Left edge of the card on the page, in mm.
     * @param float $cropY Top edge of the card on the page, in mm.
     * @param float $cardWidthMm Finished width of the card.
     * @param float $cardHeightMm Finished height of the card.
     * @return array{png: string, width: int, height: int}
     *
     * @throws PrintFailed
     */
    public function cropToPng(string $pdfPath, float $pageWidthMm, float $cropX, float $cropY, float $cardWidthMm, float $cardHeightMm): array
    {
        $scale = self::PNG_WIDTH / $cardWidthMm;
        $height = (int) round($cardHeightMm * $scale);
        $directory = sys_get_temp_dir();
        $prefix = tempnam($directory, 'printopoly-png-');

        throw_if($prefix === false, PrintFailed::class, 'No temporary file for the PNG.');

        $png = $prefix . '.png';

        try {
            $result = Process::timeout(120)->run([
                'pdftoppm',
                '-png',
                '-singlefile',
                '-f', '1',
                '-l', '1',
                '-scale-to-x', (string) (int) round($pageWidthMm * $scale),
                '-scale-to-y', '-1',
                '-x', (string) (int) round($cropX * $scale),
                '-y', (string) (int) round($cropY * $scale),
                '-W', (string) self::PNG_WIDTH,
                '-H', (string) $height,
                $pdfPath,
                $prefix,
            ]);

            $bytes = $result->successful() && is_file($png) ? file_get_contents($png) : false;

            if ($bytes === false || $bytes === '') {
                throw new PrintFailed('pdftoppm could not make the PNG: ' . trim($result->errorOutput()));
            }

            return ['png' => $bytes, 'width' => self::PNG_WIDTH, 'height' => $height];
        } finally {
            File::delete($png);
            File::delete($prefix);
        }
    }
}
