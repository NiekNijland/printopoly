<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Models\Edition;
use Illuminate\Support\Facades\Log;
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
     * @return array<string, mixed>
     */
    public function from(Edition $edition): array
    {
        $payload = [
            'schemaVersion' => $edition->schema_version,
            'id' => $edition->edition_id,
            'name' => $edition->name,
            'language' => $edition->language,
            'currency' => $edition->currency,
            'theme' => $edition->theme,
            'boardProfile' => $edition->board_profile,
            'parts' => $edition->parts,
            'elements' => self::asObject($this->repaired($edition)),
            'revision' => $edition->revision,
            'createdAt' => $edition->created_at_ms,
            'updatedAt' => $edition->updated_at_ms,
        ];

        // The template the edition started from (B152), only when there is one.
        if (is_string($edition->template) && $edition->template !== '') {
            $payload['template'] = $edition->template;
        }

        // How much play money to print (B156), only when the edition chose.
        if (is_string($edition->money_amount) && $edition->money_amount !== '') {
            $payload['moneyAmount'] = $edition->money_amount;
        }

        // What goes in the print set (B198), only when the print page chose.
        $selection = PrintSelection::parse($edition->print_selection);

        if ($selection !== null) {
            $payload['printSelection'] = $selection;
        }

        return $payload;
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
