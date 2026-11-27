<?php

declare(strict_types=1);

namespace App\Modules\Print\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class PrintJobLinkData extends Data
{
    public function __construct(
        public readonly string $token,
        public readonly string $url,
        public readonly string $statusUrl,
    ) {
    }
}
