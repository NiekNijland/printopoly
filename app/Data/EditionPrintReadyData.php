<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What is ready to download for one edition of the account, for the cards of Mijn edities (B95: made files stay
 * 7 days). `*ReadyUntil` is set when every part that was asked for in that set is done and current; it is the time
 * the first of those files goes away, in milliseconds. `*Outdated` says that the edition changed after files were
 * made, so the set has to be made again.
 */
#[TypeScript]
final class EditionPrintReadyData extends Data
{
    public function __construct(
        public readonly string $editionId,
        public readonly ?int $printerReadyUntil,
        public readonly bool $printerOutdated,
        public readonly ?int $homeReadyUntil,
        public readonly bool $homeOutdated,
    ) {
    }
}
