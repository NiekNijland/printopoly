<?php

declare(strict_types=1);

namespace App\Modules\Editions\Events;

/**
 * An edition is gone from the account. Whatever hangs off it (photos,
 * derivatives, print files) has to go too: the print pipeline listens for
 * this event and removes the assets of `$editionId` for `$userId`.
 */
final readonly class EditionDeletedEvent
{
    public function __construct(
        public string $userId,
        public string $editionId,
    ) {
    }
}
