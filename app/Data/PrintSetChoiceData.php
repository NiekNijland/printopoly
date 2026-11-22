<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\BoardForm;
use App\Enums\MoneyAmount;
use App\Enums\PrintPart;
use App\Models\PrintJob;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What the print page chose for one set: the parts it leaves out (bug 6 of test round 3), how much play money it
 * prints (B156), how many sets it makes (each with its own set mark on the cards and the money, B242), how the print
 * shop delivers the board (B243) and how many invitations it counts with (B244).
 */
#[TypeScript]
final class PrintSetChoiceData extends Data
{
    /**
     * @param list<PrintPart> $skipped
     */
    public function __construct(
        #[LiteralTypeScriptType('PrintPart[]')]
        public readonly array $skipped,
        /** Null keeps the choice of the edition, or the default of the set. */
        public readonly ?MoneyAmount $moneyAmount,
        public readonly int $copies,
        public readonly BoardForm $boardForm = BoardForm::Panels,
        public readonly int $invitations = PrintJob::DEFAULT_INVITATIONS,
    ) {
    }
}
