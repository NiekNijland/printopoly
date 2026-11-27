<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class BoxContributionData extends Data
{
    /**
     * @param list<string> $open what the owner has not applied or passed over yet (B175)
     */
    public function __construct(
        public readonly string $id,
        public readonly string $elementKey,
        public readonly string $firstName,
        public readonly string $field,
        public readonly ?string $value,
        public readonly ?int $amount,
        public readonly array $open,
        public readonly bool $hasPhoto,
        public readonly ?int $width,
        public readonly ?int $height,
        public readonly ?string $photoUrl,
        public readonly ?int $createdAt,
    ) {
    }
}
