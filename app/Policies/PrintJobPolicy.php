<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PrintJob;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * A job with an account belongs to that user alone. A job without one is
 * reachable only through its secret token, which is the route key (B80), so
 * knowing the link is the permission. The token of a user's job opens nothing
 * for anybody else.
 */
final class PrintJobPolicy
{
    public function view(?User $user, PrintJob $printJob): bool
    {
        if ($printJob->isAnonymous()) {
            return true;
        }

        return $user instanceof User && $printJob->user_id === $user->publicId();
    }

    /**
     * More photos go only to a job without an account (B80); any other job is not there for this route.
     */
    public function addPhotos(?User $user, PrintJob $printJob): Response
    {
        return $printJob->isAnonymous() ? Response::allow() : Response::denyAsNotFound();
    }
}
