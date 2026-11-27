<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Models\Edition;
use App\Modules\Editions\Data\EditionData;
use Illuminate\Support\Facades\Log;
use Spatie\LaravelData\Optional;
use stdClass;

/**
 * An edition the way the browser holds it: the `Edition` type of
 * resources/js/lib/render/edition-types.ts. `elements` always leaves as an object,
 * also when it is empty (`{}`, never `[]`).
 */
final readonly class EditionPayload
{
    public function __construct(private ElementRepairer $repairer)
    {
    }

    /**
     * @return array<mixed>
     */
    public function from(Edition $edition): array
    {
        return $this->data($edition)->toArray();
    }

    /**
     * The same edition as a Data object, for a JSON answer (B81).
     */
    public function data(Edition $edition): EditionData
    {
        return new EditionData(
            schemaVersion: $edition->schema_version,
            id: $edition->edition_id,
            name: $edition->name,
            language: $edition->language,
            currency: $edition->currency,
            theme: $edition->theme,
            boardProfile: $edition->board_profile,
            parts: $edition->parts,
            elements: self::asObject($this->repaired($edition)),
            revision: $edition->revision,
            createdAt: $edition->created_at_ms,
            updatedAt: $edition->updated_at_ms,
            // The template (B152), the play money (B156) and the print set (B198) leave only when the edition chose one.
            template: is_string($edition->template) && $edition->template !== '' ? $edition->template : new Optional(),
            moneyAmount: is_string($edition->money_amount) && $edition->money_amount !== '' ? $edition->money_amount : new Optional(),
            printSelection: PrintSelection::parse($edition->print_selection) ?? new Optional(),
        );
    }

    /**
     * The stored elements, migrated and repaired where they break a rule, so the edition always opens in the
     * browser (round 4, bug 1). A repair is logged; the stored document is left as it is until the next save.
     *
     * @return array<string, mixed>
     */
    private function repaired(Edition $edition): array
    {
        $repaired = [];
        $elements = $this->repairer->repair(self::migrated($edition->elements), $repaired);

        if ($repaired !== []) {
            Log::warning('Edition repaired on read', ['edition' => $edition->edition_id, 'repaired' => $repaired]);
        }

        return $elements;
    }

    /**
     * The stored elements with keys that have moved since (B148), for a document the migration has not reached.
     *
     * @param array<string, array<string, mixed>> $elements
     * @return array<string, array<string, mixed>>
     */
    public static function migrated(array $elements): array
    {
        $moved = [];

        foreach (ElementMigration::keys($elements) as $key => $override) {
            $moved[(string) $key] = $override;
        }

        return $moved;
    }

    /**
     * An empty array would become a JSON list or a BSON array; an object stays
     * an object.
     *
     * @param array<string, mixed> $elements
     * @return array<string, mixed>|stdClass
     */
    public static function asObject(array $elements): array|stdClass
    {
        return $elements === [] ? new stdClass() : $elements;
    }
}
