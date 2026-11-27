<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class ShareImageStatusData extends Data
{
    public function __construct(
        public readonly string $status,
        public readonly string|Optional $message = new Optional(),
    ) {
    }
}
