<?php

declare(strict_types=1);

namespace App\Actions\Editions;

use App\Edition\EditionConflict;
use App\Edition\EditionPayload;
use App\Edition\EditionValidator;
use App\Models\Edition;

/**
 * Autosave (B60): only the changed settings and elements travel. An element
 * with `null` loses its override. The revision check lives in
 * SaveEditionChanges.
 *
 * @phpstan-import-type PatchInput from EditionValidator
 */
final readonly class PatchEdition
{
    public function __construct(private SaveEditionChanges $save)
    {
    }

    /**
     * @param PatchInput $patch
     *
     * @throws EditionConflict
     */
    public function handle(Edition $edition, array $patch): Edition
    {
        // Check first, so a stale patch is turned away before any merging.
        if ($edition->revision !== $patch['baseRevision']) {
            throw new EditionConflict($edition);
        }

        $attributes = [];

        foreach (['name', 'language', 'currency', 'theme', 'parts'] as $field) {
            if (array_key_exists($field, $patch)) {
                $attributes[$field] = $patch[$field];
            }
        }

        if (array_key_exists('boardProfile', $patch)) {
            $attributes['board_profile'] = $patch['boardProfile'];
        }

        if (array_key_exists('elements', $patch)) {
            $elements = EditionPayload::migrated($edition->elements);

            foreach ($patch['elements'] as $key => $override) {
                if ($override === null) {
                    unset($elements[$key]);
                } else {
                    $elements[$key] = $override;
                }
            }

            $attributes['elements'] = $elements;
        }

        return $this->save->handle($edition, $patch['baseRevision'], $attributes);
    }
}
