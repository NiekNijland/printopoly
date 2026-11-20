<?php

declare(strict_types=1);

namespace App\Print;

/**
 * What a finished PDF must look like (B12, B63): every page the same size,
 * and an exact number of pages. `pages` is null when the number depends on a
 * packing that only the browser computes (home stickers of a custom board).
 */
final readonly class ExpectedPdf
{
    public function __construct(
        public ?int $pages,
        public float $widthMm,
        public float $heightMm,
    ) {
    }
}
