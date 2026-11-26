<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Boxes\BoxCleanup;
use App\Modules\Accounts\Events\AccountDeletingEvent;

/**
 * An account is deleted: its collection boxes with everything friends sent go with it (B128, B68). Like the print
 * data, a failure stops the deletion, so nothing stays behind unnoticed.
 */
final readonly class RemoveAccountBoxes
{
    public function __construct(private BoxCleanup $cleanup)
    {
    }

    public function handle(AccountDeletingEvent $event): void
    {
        $this->cleanup->deleteForUser($event->userId);
    }
}
