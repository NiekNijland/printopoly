<?php

declare(strict_types=1);

namespace App\Integrations\Chrome\Contracts;

use App\Integrations\Chrome\ChromePdfRenderer;
use Illuminate\Container\Attributes\Bind;

/**
 * Turns an HTML page into PDF bytes. The real one drives headless Chrome;
 * tests bind a fake that writes a PDF of a known size.
 */
#[Bind(ChromePdfRenderer::class)]
interface PdfRenderer
{
    /**
     * @param bool $waitForReady Wait for `window.printReady` (fonts, images and text fitting, B54).
     */
    public function render(string $html, float $widthMm, float $heightMm, bool $waitForReady): string;
}
