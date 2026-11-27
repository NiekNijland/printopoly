<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class ContributionReceiptData extends Data
{
    public function __construct(
        public readonly string $id,
        public readonly string $receipt,
    ) {
    }
}
