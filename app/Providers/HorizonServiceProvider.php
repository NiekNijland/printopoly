<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\HorizonApplicationServiceProvider;
use Override;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Outside local, only the addresses in HORIZON_ADMIN_EMAILS see Horizon.
     */
    #[Override]
    protected function gate(): void
    {
        Gate::define('viewHorizon', static fn (?User $user = null): bool => $user instanceof User
            && in_array($user->email, Config::array('horizon.admin_emails'), true));
    }
}
