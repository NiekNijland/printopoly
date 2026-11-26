<?php

declare(strict_types=1);

namespace App\Modules\Editions\Actions;

use App\Models\Edition;
use App\Modules\Editions\Events\EditionDeletedEvent;

/**
 * Removes an edition from the account for good (B96). The print pipeline
 * removes its photos and print files when it hears EditionDeletedEvent.
 */
final readonly class DeleteEdition
{
    public function handle(Edition $edition): void
    {
        $userId = $edition->user_id;
        $editionId = $edition->edition_id;

        $edition->delete();

        event(new EditionDeletedEvent($userId, $editionId));
    }
}
