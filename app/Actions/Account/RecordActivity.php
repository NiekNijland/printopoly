<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Notes that an account was used (B120). Writes are throttled to once per
 * hour, so a busy editor does not write on every request. A pending
 * inactivity warning is always cleared: using the account restarts the
 * period.
 */
final class RecordActivity
{
    public function handle(User $user, bool $force = false): void
    {
        $now = CarbonImmutable::now();
        $lastActive = $user->last_active_at;
        $hasWarning = $user->inactivity_warning_sent_at !== null;

        $throttle = config()->integer('printopoly.inactivity.activity_throttle_minutes');

        if (! $force && ! $hasWarning && $lastActive !== null && $lastActive->greaterThan($now->subMinutes($throttle))) {
            return;
        }

        $fresh = [
            'last_active_at' => $now,
            'inactivity_warning_sent_at' => null,
            'inactivity_warning_locale' => null,
        ];

        User::query()->whereKey($user->getKey())->update($fresh);

        $user->setRawAttributes(array_merge($user->getAttributes(), $fresh), sync: true);
    }
}
