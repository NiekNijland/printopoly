<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class OwnContributionsData extends Data
{
    /**
     * @param array<string, string> $contributions per receipt: waiting, applied, passed or handled
     */
    public function __construct(
        #[LiteralTypeScriptType("Record<string, 'waiting' | 'applied' | 'passed' | 'handled'>")]
        public readonly array $contributions,
    ) {
    }
}
