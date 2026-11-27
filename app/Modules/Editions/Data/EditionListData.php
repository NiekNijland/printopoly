<?php

declare(strict_types=1);

namespace App\Modules\Editions\Data;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class EditionListData extends Data
{
    /**
     * @param list<EditionSummaryData> $editions
     */
    public function __construct(
        #[DataCollectionOf(EditionSummaryData::class)]
        public readonly array $editions,
        public readonly int $limit,
    ) {
    }
}
