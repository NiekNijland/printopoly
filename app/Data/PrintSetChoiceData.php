<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\MoneyAmount;
use App\Enums\PrintPart;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What the print page chose for one set: the parts it leaves out (bug 6 of test round 3), how much play money it
 * prints (B156) and how many sets the instructions count with.
 */
#[TypeScript]
final class PrintSetChoiceData extends Data
{
    /**
     * @param list<PrintPart> $skipped
     */
    public function __construct(
        public readonly array $skipped,
        /** Null keeps the choice of the edition, or the default of the set. */
        public readonly ?MoneyAmount $moneyAmount,
        public readonly int $copies,
    ) {
    }
}
