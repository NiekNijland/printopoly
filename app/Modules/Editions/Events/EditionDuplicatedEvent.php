<?php

declare(strict_types=1);

namespace App\Modules\Editions\Events;

/**
 * An edition was copied inside the account (B96). Its photos stay with the
 * original until the print pipeline copies them: it listens for this event and
 * makes `$copyId` its own assets, with new photo ids it then writes into the
 * copy's elements.
 */
final readonly class EditionDuplicatedEvent
{
    public function __construct(
        public string $userId,
        public string $sourceId,
        public string $copyId,
    ) {
    }
}
