<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Asset;
use App\Models\User;

/**
 * Photos are private (B68): only the owner gets a temporary link to one.
 * Photos of an anonymous job have no user and are never served by id.
 */
final class AssetPolicy
{
    public function view(User $user, Asset $asset): bool
    {
        return $asset->user_id !== null && $asset->user_id === $user->publicId();
    }
}
