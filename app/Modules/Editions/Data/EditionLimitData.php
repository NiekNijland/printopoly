<?php

declare(strict_types=1);

namespace App\Modules\Editions\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class EditionLimitData extends Data
{
    public function __construct(
        public readonly string $code,
        public readonly string $message,
        public readonly int $limit,
    ) {
    }
}
