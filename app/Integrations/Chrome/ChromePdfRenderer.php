<?php

declare(strict_types=1);

namespace App\Integrations\Chrome;

use App\Integrations\Chrome\Contracts\PdfRenderer;
use Override;
use Spatie\LaravelPdf\Facades\Pdf;

/**
 * spatie/laravel-pdf with the Chrome driver (B52, B54). The page size is the
 * sheet size and the margins are zero; the print page sets the same size in
 * CSS and keeps every page a hair shorter than the sheet (B63).
 */
final class ChromePdfRenderer implements PdfRenderer
{
    #[Override]
    public function render(string $html, float $widthMm, float $heightMm, bool $waitForReady): string
    {
        $pdf = Pdf::html($html)
            ->paperSize($this->chromeInches($widthMm), $this->chromeInches($heightMm), 'in')
            ->margins(0, 0, 0, 0, 'mm')
            ->dontCache();

        if ($waitForReady) {
            // The driver gives up silently at the timeout; the PDF check then
            // catches a page that never finished.
            $pdf->waitUntilReady('window.printReady === true', config()->integer('printopoly.print.ready_timeout_ms'));
        }

        return $pdf->generatePdfContent();
    }

    /**
     * Chrome rounds a page size to whole points, and rounds a fraction up to the next point
     * (B63: ±0.2 mm). Asking for 0.2 pt less than the nearest whole point gives exactly that
     * point, so the page is off by at most half a point (0.18 mm) instead of a full one.
     */
    private function chromeInches(float $millimetres): float
    {
        return (round($millimetres / 25.4 * 72) - 0.2) / 72;
    }
}
