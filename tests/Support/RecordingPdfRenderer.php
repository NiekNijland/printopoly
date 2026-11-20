<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Print\PdfRenderer;
use Override;
use RuntimeException;

/**
 * Stands in for Chrome where only one blank page of the asked size matters, and records what it was asked.
 */
final class RecordingPdfRenderer implements PdfRenderer
{
    /** @var list<array{string, float, float, bool}> */
    public array $calls = [];

    public bool $crash = false;

    #[Override]
    public function render(string $html, float $widthMm, float $heightMm, bool $waitForReady): string
    {
        $this->calls[] = [$html, $widthMm, $heightMm, $waitForReady];

        if ($this->crash) {
            throw new RuntimeException('Chrome crashed.');
        }

        return TestPdf::make([[$widthMm, $heightMm]]);
    }
}
