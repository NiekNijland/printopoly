<?php

declare(strict_types=1);

namespace App\Photos;

use RuntimeException;

/**
 * An upload that is refused (B69, B70). The message is a translation key
 * from lang/*.json, with the numbers it needs.
 */
final class PhotoRejected extends RuntimeException
{
    /**
     * @param array<string, int|string> $replacements
     */
    public function __construct(
        public readonly string $translationKey,
        public readonly array $replacements = [],
    ) {
        parent::__construct($translationKey);
    }

    public static function wrongType(): self
    {
        return new self('photo.wrong_type');
    }

    public static function tooLarge(int $megabytes): self
    {
        return new self('photo.too_large', ['mb' => $megabytes]);
    }

    public static function tooManyPixels(int $megapixels): self
    {
        return new self('photo.too_many_pixels', ['mp' => $megapixels]);
    }

    public static function unreadable(): self
    {
        return new self('photo.unreadable');
    }

    public function translated(): string
    {
        return __($this->translationKey, $this->replacements);
    }
}
