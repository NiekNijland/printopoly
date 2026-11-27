<?php

declare(strict_types=1);

namespace App\Modules\Print\Data;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class PrintJobReadyListData extends Data
{
    /**
     * @param list<PrintJobReadyData> $jobs
     */
    public function __construct(
        #[DataCollectionOf(PrintJobReadyData::class)]
        public readonly array $jobs,
    ) {
    }
}
