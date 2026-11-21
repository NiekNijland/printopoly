<?php

declare(strict_types=1);

namespace App\Edition;

use App\Models\Edition;
use stdClass;

/**
 * An edition the way the browser holds it: the `Edition` type of
 * resources/js/lib/edition/types.ts. `elements` always leaves as an object,
 * also when it is empty (`{}`, never `[]`).
 */
final class EditionPayload
{
    /**
     * @return array<string, mixed>
     */
    public static function from(Edition $edition): array
    {
        return [
            'schemaVersion' => $edition->schema_version,
            'id' => $edition->edition_id,
            'name' => $edition->name,
            'language' => $edition->language,
            'currency' => $edition->currency,
            'theme' => $edition->theme,
            'boardProfile' => $edition->board_profile,
            'parts' => $edition->parts,
            'elements' => self::asObject(self::migrated($edition->elements)),
            'revision' => $edition->revision,
            'createdAt' => $edition->created_at_ms,
            'updatedAt' => $edition->updated_at_ms,
        ];
    }

    /**
     * The stored elements with keys that have moved since (B148), for a document the migration has not reached.
     *
     * @param array<string, array<string, mixed>> $elements
     * @return array<string, array<string, mixed>>
     */
    public static function migrated(array $elements): array
    {
        /** @var array<string, array<string, mixed>> $moved */
        $moved = EditionValidator::migrateElements($elements);

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
