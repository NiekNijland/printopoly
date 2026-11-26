<?php

declare(strict_types=1);

namespace App\Modules\Print\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What is ready to download for one print job the browser asked about by its token, for an edition that lives
 * only in the browser (bug 14 of the integration check). The fields mean the same as in EditionPrintReadyData.
 */
#[TypeScript]
final class PrintJobReadyData extends Data
{
    public function __construct(
        public readonly string $token,
        public readonly ?int $printerReadyUntil,
        public readonly bool $printerOutdated,
        public readonly ?int $homeReadyUntil,
        public readonly bool $homeOutdated,
    ) {
    }
}
