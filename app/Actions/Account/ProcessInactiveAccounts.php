<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Enums\Locale;
use App\Mail\InactiveAccountWarning;
use App\Models\User;
use App\Support\MailConfig;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Keeps the promise of the privacy statement (B68, B120): an account that was
 * not used for 24 months is deleted with everything in it, and 30 days before
 * that we send an e-mail. An account is only deleted after a warning that was
 * really sent, so with no working mail setup nothing is ever deleted.
 */
final readonly class ProcessInactiveAccounts
{
    public function __construct(private DeleteAccount $deleteAccount)
    {
    }

    /**
     * @return array{warned: int, deleted: int}
     */
    public function handle(): array
    {
        if (! MailConfig::isConfigured()) {
            Log::warning('Inactive accounts: mail is not configured, so no warnings are sent and no accounts are deleted.');

            return ['warned' => 0, 'deleted' => 0];
        }

        $now = CarbonImmutable::now();

        return [
            'warned' => $this->warn($now),
            'deleted' => $this->delete($now),
        ];
    }

    private function warn(CarbonImmutable $now): int
    {
        $cutoff = $now->subMonthsNoOverflow($this->months('warn_after_months'));
        $warned = 0;

        $candidates = User::query()
            ->whereNull('inactivity_warning_sent_at')
            ->where(static function (Builder $query) use ($cutoff): void {
                $query->where('last_active_at', '<', $cutoff)
                    ->orWhere(static function (Builder $query) use ($cutoff): void {
                        $query->whereNull('last_active_at')->where('created_at', '<', $cutoff);
                    });
            })
            ->lazyById();

        foreach ($candidates as $user) {
            if ($this->warnUser($user, $now)) {
                $warned++;
            }
        }

        return $warned;
    }

    private function warnUser(User $user, CarbonImmutable $now): bool
    {
        $locale = Locale::tryFrom((string) $user->locale) ?? Locale::default();

        try {
            Mail::to($user->email)->send(new InactiveAccountWarning($user, $this->deletionDate($user, $now), $locale));
        } catch (Throwable $throwable) {
            // Not recorded as sent, so the next run tries again.
            report($throwable);

            return false;
        }

        User::query()->whereKey($user->getKey())->update([
            'inactivity_warning_sent_at' => $now,
            'inactivity_warning_locale' => $locale->value,
        ]);

        return true;
    }

    private function delete(CarbonImmutable $now): int
    {
        $warnedBefore = $now->subDays($this->days());
        $inactiveBefore = $now->subMonthsNoOverflow($this->months('delete_after_months'));
        $deleted = 0;

        $candidates = User::query()
            ->whereNotNull('inactivity_warning_sent_at')
            ->where('inactivity_warning_sent_at', '<=', $warnedBefore)
            ->lazyById();

        foreach ($candidates as $user) {
            $warningSentAt = $user->inactivity_warning_sent_at;
            $lastActive = $this->lastActive($user);

            // Safety net: activity clears the warning, but never delete an
            // account that was used after it, or one that is not 24 months idle.
            if (! $warningSentAt instanceof CarbonImmutable
                || $lastActive->greaterThan($warningSentAt)
                || $lastActive->greaterThanOrEqualTo($inactiveBefore)) {
                continue;
            }

            try {
                $this->deleteAccount->handle($user);
                $deleted++;
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return $deleted;
    }

    /**
     * The day the account goes: 24 months after the last use, but never
     * sooner than 30 days after this mail.
     */
    private function deletionDate(User $user, CarbonImmutable $now): CarbonImmutable
    {
        $afterGrace = $now->addDays($this->days());
        $afterInactivity = $this->lastActive($user)->addMonthsNoOverflow($this->months('delete_after_months'));

        return $afterInactivity->greaterThan($afterGrace) ? $afterInactivity : $afterGrace;
    }

    private function lastActive(User $user): CarbonImmutable
    {
        return $user->last_active_at ?? $user->created_at ?? CarbonImmutable::now();
    }

    private function months(string $key): int
    {
        return config()->integer('printopoly.inactivity.' . $key);
    }

    private function days(): int
    {
        return config()->integer('printopoly.inactivity.grace_days');
    }
}
