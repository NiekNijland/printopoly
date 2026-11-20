<?php

declare(strict_types=1);

namespace App\Print;

/**
 * Turns an HTML page into PDF bytes. The real one drives headless Chrome;
 * tests bind a fake that writes a PDF of a known size.
 */
interface PdfRenderer
{
    /**
     * @param bool $waitForReady Wait for `window.printReady` (fonts, images and text fitting, B54).
     */
    public function render(string $html, float $widthMm, float $heightMm, bool $waitForReady): string;
}
