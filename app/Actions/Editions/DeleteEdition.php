<?php

declare(strict_types=1);

namespace App\Actions\Editions;

use App\Events\EditionDeleted;
use App\Models\Edition;

/**
 * Removes an edition from the account for good (B96). The print pipeline
 * removes its photos and print files when it hears EditionDeleted.
 */
final readonly class DeleteEdition
{
    public function handle(Edition $edition): void
    {
        $userId = $edition->user_id;
        $editionId = $edition->edition_id;

        $edition->delete();

        event(new EditionDeleted($userId, $editionId));
    }
}
