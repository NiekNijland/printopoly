<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Accounts\Actions;

use App\Models\User;
use App\Modules\Accounts\Actions\ProcessInactiveAccounts;
use App\Modules\Accounts\Events\AccountDeletingEvent;
use App\Modules\Accounts\Mail\InactiveAccountWarningMail;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Symfony\Component\Mime\Exception\RfcComplianceException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class ProcessInactiveAccountsTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_without_a_working_mail_setup_nothing_is_warned_or_deleted(): void
    {
        config(['mail.default' => 'array']);
        Mail::fake();
        $idle = $this->idleUser(23);
        $warned = $this->idleUser(25, ['inactivity_warning_sent_at' => now()->subDays(60)]);

        $counts = resolve(ProcessInactiveAccounts::class)->handle();

        self::assertSame(['warned' => 0, 'deleted' => 0], $counts);
        Mail::assertNothingSent();
        self::assertNull($idle->refresh()->inactivity_warning_sent_at);
        self::assertNotNull(User::query()->find($warned->getKey()));
    }

    public function test_an_idle_account_is_warned_once_with_the_date_it_goes(): void
    {
        $this->workingMail();
        config(['printopoly.inactivity.grace_days' => 10]);
        Mail::fake();
        $anna = $this->idleUser(23, ['locale' => 'en']);
        $longIdle = $this->idleUser(30);
        $recent = $this->idleUser(22);
        $process = resolve(ProcessInactiveAccounts::class);

        self::assertSame(['warned' => 2, 'deleted' => 0], $process->handle());
        self::assertSame(['warned' => 0, 'deleted' => 0], $process->handle());

        Mail::assertSent(InactiveAccountWarningMail::class, 2);
        Mail::assertSent(InactiveAccountWarningMail::class, static fn (InactiveAccountWarningMail $mail): bool => $mail->hasTo($anna->email)
            && $mail->mailLocale->value === 'en'
            && $mail->deletionDate->toDateString() === now()->subMonthsNoOverflow(23)->subDay()->addMonthsNoOverflow(24)->toDateString());
        Mail::assertSent(InactiveAccountWarningMail::class, static fn (InactiveAccountWarningMail $mail): bool => $mail->hasTo($longIdle->email)
            && $mail->mailLocale->value === 'nl'
            && $mail->deletionDate->toDateString() === now()->addDays(10)->toDateString());
        $stored = $anna->refresh();
        self::assertSame(now()->toDateTimeString(), $stored->inactivity_warning_sent_at?->toDateTimeString());
        self::assertSame('en', $stored->inactivity_warning_locale);
        self::assertNull($recent->refresh()->inactivity_warning_sent_at);
    }

    public function test_an_account_without_activity_counts_from_when_it_was_made(): void
    {
        $this->workingMail();
        Mail::fake();
        $old = User::factory()->createOne();
        $old->forceFill(['created_at' => now()->subMonths(23)->subDay()])->save();
        User::factory()->createOne();

        self::assertSame(['warned' => 1, 'deleted' => 0], resolve(ProcessInactiveAccounts::class)->handle());
        Mail::assertSent(InactiveAccountWarningMail::class, static fn (InactiveAccountWarningMail $mail): bool => $mail->hasTo($old->email));
    }

    public function test_a_mail_that_cannot_go_out_is_reported_and_tried_again_next_time(): void
    {
        config(['mail.default' => 'opvang', 'mail.mailers.opvang' => ['transport' => 'array']]);
        Exceptions::fake([RfcComplianceException::class]);
        $broken = $this->idleUser(23, ['email' => 'geen adres']);
        $fine = $this->idleUser(23, ['email' => 'anna@example.com']);

        self::assertSame(['warned' => 1, 'deleted' => 0], resolve(ProcessInactiveAccounts::class)->handle());

        Exceptions::assertReported(RfcComplianceException::class);
        self::assertNull($broken->refresh()->inactivity_warning_sent_at);
        self::assertNotNull($fine->refresh()->inactivity_warning_sent_at);
    }

    public function test_an_account_warned_long_enough_ago_and_still_idle_is_deleted(): void
    {
        $this->workingMail();
        Mail::fake();
        Event::fake([AccountDeletingEvent::class]);
        $gone = $this->idleUser(24, ['inactivity_warning_sent_at' => now()->subDays(30)]);
        $tooSoon = $this->idleUser(24, ['inactivity_warning_sent_at' => now()->subDays(29)]);
        $usedSince = $this->idleUser(24, ['inactivity_warning_sent_at' => now()->subDays(40)]);
        $usedSince->forceFill(['last_active_at' => now()->subDays(35)])->save();
        $notIdleLongEnough = User::factory()->createOne(['inactivity_warning_sent_at' => now()->subDays(40)]);
        $notIdleLongEnough->forceFill(['last_active_at' => now()->subMonthsNoOverflow(24)->addDay()])->save();

        self::assertSame(['warned' => 0, 'deleted' => 1], resolve(ProcessInactiveAccounts::class)->handle());

        self::assertNull(User::query()->find($gone->getKey()));
        self::assertNotNull(User::query()->find($tooSoon->getKey()));
        self::assertNotNull(User::query()->find($usedSince->getKey()));
        self::assertNotNull(User::query()->find($notIdleLongEnough->getKey()));
        Event::assertDispatchedTimes(AccountDeletingEvent::class, 1);
    }

    public function test_a_deletion_that_fails_is_reported_and_the_account_stays(): void
    {
        $this->workingMail();
        Mail::fake();
        Exceptions::fake([RuntimeException::class]);
        Event::listen(AccountDeletingEvent::class, static function (): never {
            throw new RuntimeException('Opslag is onbereikbaar');
        });
        $user = $this->idleUser(25, ['inactivity_warning_sent_at' => now()->subDays(31)]);

        self::assertSame(['warned' => 0, 'deleted' => 0], resolve(ProcessInactiveAccounts::class)->handle());

        Exceptions::assertReported(static fn (RuntimeException $exception): bool => $exception->getMessage() === 'Opslag is onbereikbaar');
        self::assertNotNull(User::query()->find($user->getKey()));
    }

    private function workingMail(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.example.com',
            'mail.mailers.smtp.username' => 'printopoly',
            'mail.mailers.smtp.password' => 'wachtwoord',
        ]);
    }

    /**
     * @param array<string, mixed> $attributes
     */
    private function idleUser(int $months, array $attributes = []): User
    {
        $user = User::factory()->createOne($attributes);
        $user->forceFill(['last_active_at' => CarbonImmutable::now()->subMonthsNoOverflow($months)->subDay()])->save();

        return $user;
    }
}
