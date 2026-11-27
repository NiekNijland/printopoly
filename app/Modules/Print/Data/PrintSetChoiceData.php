<?php

declare(strict_types=1);

namespace App\Modules\Print\Data;

use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
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
    /** Invitations without a choice: one A4 sheet of four at home (B244). */
    public const int DEFAULT_INVITATIONS = 4;

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
        public readonly int $invitations = self::DEFAULT_INVITATIONS,
    ) {
    }
}
