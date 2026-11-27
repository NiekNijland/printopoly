<?php

declare(strict_types=1);

namespace App\Modules\Editions\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What became of every edition of an import, by id (B81).
 */
#[TypeScript]
final class EditionImportData extends Data
{
    /**
     * @param list<string> $imported
     * @param list<string> $conflicts
     * @param list<string> $overLimit
     * @param array<string, list<string>> $invalid the messages per edition id that did not validate
     */
    public function __construct(
        public readonly array $imported,
        public readonly array $conflicts,
        public readonly array $overLimit,
        public readonly array $invalid,
    ) {
    }
}
