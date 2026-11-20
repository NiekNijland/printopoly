<?php

declare(strict_types=1);

namespace App\Events;

/**
 * An account is about to be deleted (B68). It is dispatched synchronously
 * before the user and their editions are removed, so the print pipeline can
 * listen and delete every asset, derivative and print file of `$userId`
 * (originals on R2 included). A listener that throws stops the deletion:
 * nothing is left behind half-way without the user knowing.
 */
final readonly class AccountDeleting
{
    public function __construct(public string $userId)
    {
    }
}
