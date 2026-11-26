<?php

declare(strict_types=1);

namespace App\Modules\Editions\Data;

use App\Models\Edition;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * One line of "Mijn edities" for an edition in the account: enough to list it
 * and to compare it with the local copy (B79, B81). Times are milliseconds,
 * like in the browser.
 */
#[TypeScript]
final class EditionSummaryData extends Data
{
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        #[LiteralTypeScriptType("'nl' | 'en'")]
        public readonly string $language,
        #[LiteralTypeScriptType("'classic' | 'riso' | 'strak' | 'gala'")]
        public readonly string $theme,
        public readonly int $revision,
        public readonly int $createdAt,
        public readonly int $updatedAt,
    ) {
    }

    public static function fromEdition(Edition $edition): self
    {
        return new self(
            id: $edition->edition_id,
            name: $edition->name,
            language: $edition->language,
            theme: $edition->theme,
            revision: $edition->revision,
            createdAt: $edition->created_at_ms,
            updatedAt: $edition->updated_at_ms,
        );
    }
}
