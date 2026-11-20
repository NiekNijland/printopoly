<?php

declare(strict_types=1);

namespace App\Photos;

/**
 * The two derived images of an upload (B61), still in memory.
 */
final readonly class ProcessedPhoto
{
    public function __construct(
        public string $preview,
        public string $printSource,
        public int $printWidth,
        public int $printHeight,
        public int $originalWidth,
        public int $originalHeight,
        /** The print source is a PNG because the picture has transparent areas (B125). */
        public bool $transparent = false,
    ) {
    }
}
