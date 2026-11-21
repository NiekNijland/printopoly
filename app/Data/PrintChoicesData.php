<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;
use Spatie\LaravelData\Data;

/**
 * The choices of the print page per set, kept on the job so a reload or a visit from Mijn edities shows them again.
 */
#[TypeScript]
final class PrintChoicesData extends Data
{
    public function __construct(
        public readonly PrintSetChoiceData $printer,
        public readonly PrintSetChoiceData $home,
    ) {
    }
}
