<?php

declare(strict_types=1);

namespace App\Modules\Print\Listeners;

use App\Modules\Editions\Events\EditionDeletedEvent;
use App\Modules\Print\Support\PrintCleanup;

/**
 * An edition is gone from the account: its photos, print job and PDFs go too (B68).
 */
final readonly class RemoveEditionPrintData
{
    public function __construct(private PrintCleanup $cleanup)
    {
    }

    public function handle(EditionDeletedEvent $event): void
    {
        $this->cleanup->deleteEdition($event->userId, $event->editionId);
    }
}
