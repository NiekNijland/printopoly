<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\EditionDeleted;
use App\Print\PrintCleanup;

/**
 * An edition is gone from the account: its photos, print job and PDFs go too (B68).
 */
final readonly class RemoveEditionPrintData
{
    public function __construct(private PrintCleanup $cleanup)
    {
    }

    public function handle(EditionDeleted $event): void
    {
        $this->cleanup->deleteEdition($event->userId, $event->editionId);
    }
}
