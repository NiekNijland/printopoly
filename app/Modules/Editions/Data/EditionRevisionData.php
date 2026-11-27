<?php

declare(strict_types=1);

namespace App\Modules\Editions\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class EditionRevisionData extends Data
{
    public function __construct(
        public readonly int $revision,
        public readonly int $updatedAt,
        public readonly string|Optional $name = new Optional(),
    ) {
    }
}
