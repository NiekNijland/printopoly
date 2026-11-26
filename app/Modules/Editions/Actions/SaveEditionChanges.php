<?php

declare(strict_types=1);

namespace App\Modules\Editions\Actions;

use App\Models\Edition;
use App\Modules\Editions\Exceptions\EditionConflictException;
use App\Modules\Editions\Support\EditionPayload;
use App\Support\JsonShape;

/**
 * The one place an existing edition changes (B60, B81). The update only
 * matches while the stored revision is still `$baseRevision`, in one atomic
 * operation: when another window saved in between, nothing is written and the
 * caller gets a conflict with the server's version. Nothing is overwritten
 * silently.
 */
final readonly class SaveEditionChanges
{
    public function __construct(private EditionPayload $payload)
    {
    }

    /**
     * @param array<string, mixed> $attributes attributes to set, in Eloquent (snake_case) names
     * @param int|null $newRevision defaults to the base revision plus one; a larger value is how the browser's
     *                              own count carries over after several offline changes
     *
     * @throws EditionConflictException
     */
    public function handle(Edition $edition, int $baseRevision, array $attributes, ?int $newRevision = null): Edition
    {
        if ($edition->revision !== $baseRevision) {
            throw new EditionConflictException($this->payload->from($edition));
        }

        if (isset($attributes['elements']) && is_array($attributes['elements'])) {
            $attributes['elements'] = EditionPayload::asObject(JsonShape::map($attributes['elements'], 'elements'));
        }

        $attributes['revision'] = max($baseRevision + 1, $newRevision ?? 0);
        $attributes['updated_at_ms'] = (int) (microtime(true) * 1000);

        $matched = Edition::query()
            ->where('_id', $edition->getKey())
            ->where('revision', $baseRevision)
            ->update($attributes);

        if ($matched === 0) {
            throw new EditionConflictException($this->payload->from($edition->fresh() ?? $edition));
        }

        return $edition->fresh() ?? $edition;
    }
}
