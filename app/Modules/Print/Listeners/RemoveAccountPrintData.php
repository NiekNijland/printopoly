<?php

declare(strict_types=1);

namespace App\Modules\Print\Listeners;

use App\Modules\Accounts\Events\AccountDeletingEvent;
use App\Modules\Print\Support\PrintCleanup;

/**
 * An account is deleted: every photo, derivative, job and PDF of the user goes with it (B68).
 * A failure here stops the deletion, so nothing stays behind unnoticed.
 */
final readonly class RemoveAccountPrintData
{
    public function __construct(private PrintCleanup $cleanup)
    {
    }

    public function handle(AccountDeletingEvent $event): void
    {
        $this->cleanup->deleteUser($event->userId);
    }
}
