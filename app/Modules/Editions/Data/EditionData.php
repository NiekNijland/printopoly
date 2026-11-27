<?php

declare(strict_types=1);

namespace App\Modules\Editions\Data;

use App\Models\Edition;
use App\Modules\Editions\Support\EditionPayload;
use App\Modules\Editions\Support\EditionValidator;
use App\Modules\Editions\Support\PrintSelection;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * An edition the way the browser holds it, as EditionPayload writes it (B81).
 *
 * @phpstan-import-type Profile from EditionValidator
 * @phpstan-import-type Selection from PrintSelection
 */
#[TypeScript]
final class EditionData extends Data
{
    /**
     * @param Profile|null $boardProfile
     * @param array<string, bool>|null $parts
     * @param Selection|Optional $printSelection
     */
    public function __construct(
        public readonly int $schemaVersion,
        public readonly string $id,
        public readonly string $name,
        public readonly string $language,
        public readonly string $currency,
        public readonly string $theme,
        #[LiteralTypeScriptType('Record<string, unknown>')]
        public readonly ?array $boardProfile,
        #[LiteralTypeScriptType('Record<string, boolean>')]
        public readonly ?array $parts,
        #[LiteralTypeScriptType('Record<string, Record<string, unknown>>')]
        public readonly mixed $elements,
        public readonly int $revision,
        public readonly int $createdAt,
        public readonly int $updatedAt,
        public readonly string|Optional $template = new Optional(),
        public readonly string|Optional $moneyAmount = new Optional(),
        #[LiteralTypeScriptType('Record<string, unknown>')]
        public readonly array|Optional $printSelection = new Optional(),
    ) {
    }

    public static function fromEdition(Edition $edition): self
    {
        return new self(
            schemaVersion: $edition->schema_version,
            id: $edition->edition_id,
            name: $edition->name,
            language: $edition->language,
            currency: $edition->currency,
            theme: $edition->theme,
            boardProfile: $edition->board_profile,
            parts: $edition->parts,
            elements: EditionPayload::elements($edition),
            revision: $edition->revision,
            createdAt: $edition->created_at_ms,
            updatedAt: $edition->updated_at_ms,
            template: is_string($edition->template) && $edition->template !== '' ? $edition->template : new Optional(),
            moneyAmount: is_string($edition->money_amount) && $edition->money_amount !== '' ? $edition->money_amount : new Optional(),
            printSelection: PrintSelection::parse($edition->print_selection) ?? new Optional(),
        );
    }
}
