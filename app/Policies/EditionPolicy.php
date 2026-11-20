<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Edition;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * A user only reaches their own editions. Someone else's edition answers 404,
 * the same as an id that does not exist, so it never confirms that it exists.
 * The route binding already looks only among the user's own editions; this
 * policy is the second lock.
 */
final class EditionPolicy
{
    public function view(User $user, Edition $edition): Response
    {
        return $this->owns($user, $edition);
    }

    public function update(User $user, Edition $edition): Response
    {
        return $this->owns($user, $edition);
    }

    public function delete(User $user, Edition $edition): Response
    {
        return $this->owns($user, $edition);
    }

    private function owns(User $user, Edition $edition): Response
    {
        return $edition->user_id === $user->publicId() ? Response::allow() : Response::denyAsNotFound();
    }
}
