<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Listeners;

use App\Modules\Boxes\Support\BoxCleanup;
use App\Modules\Editions\Events\EditionDeletedEvent;

/**
 * An edition is gone from the account: its collection boxes, their contributions and photos go too (B128, B68).
 */
final readonly class RemoveEditionBoxes
{
    public function __construct(private BoxCleanup $cleanup)
    {
    }

    public function handle(EditionDeletedEvent $event): void
    {
        $this->cleanup->deleteForEdition($event->userId, $event->editionId);
    }
}
