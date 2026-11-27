<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Data;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class OwnerBoxData extends Data
{
    /**
     * @param list<BoxContributionData> $contributions
     */
    public function __construct(
        public readonly string $id,
        public readonly string $editionId,
        public readonly string $url,
        #[LiteralTypeScriptType("'open' | 'closed'")]
        public readonly string $status,
        public readonly int $expiresAt,
        public readonly int $accepted,
        public readonly int $rejected,
        public readonly bool $cardsHidden,
        public readonly string $channel,
        #[DataCollectionOf(BoxContributionData::class)]
        public readonly array $contributions,
        public readonly string|Optional $ownerSecret = new Optional(),
    ) {
    }
}
