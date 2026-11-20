<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Everything the print page needs to draw itself, from the JSON endpoint and
 * from the Reverb broadcast alike (B95). It holds no file paths and no edition
 * content.
 */
#[TypeScript]
final class PrintJobStatusData extends Data
{
    /**
     * @param list<PrintPartStatusData> $parts
     */
    public function __construct(
        /** Something is waiting or running: starting another run is refused. */
        public readonly bool $busy,
        public readonly string $printerZipUrl,
        public readonly string $homeZipUrl,
        /** Every requested part of the Drukkerij-set is done and current. */
        public readonly bool $printerZipReady,
        public readonly bool $homeZipReady,
        #[DataCollectionOf(PrintPartStatusData::class)]
        public readonly array $parts,
    ) {
    }
}
