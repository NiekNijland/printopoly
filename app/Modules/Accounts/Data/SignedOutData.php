<?php

declare(strict_types=1);

namespace App\Modules\Accounts\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class SignedOutData extends Data
{
    public function __construct(
        public readonly bool $clearLocalCopy,
        public readonly string $redirect,
    ) {
    }
}
