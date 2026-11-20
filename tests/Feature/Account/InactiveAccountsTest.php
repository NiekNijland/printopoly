<?php

declare(strict_types=1);

namespace Tests\Feature\Account;

use App\Actions\Auth\LoginWithGoogle;
use App\Events\AccountDeleting;
use App\Mail\InactiveAccountWarning;
use App\Models\Edition;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event as EventFacade;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Laravel\Socialite\Two\User as GoogleUser;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\MakesEditions;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class InactiveAccountsTest extends TestCase
{
    use MakesEditions;
    use RefreshesMongoDatabase;

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        CarbonImmutable::setTestNow('2026-11-20 12:00:00');
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.mail.me.com',
            'mail.mailers.smtp.username' => 'apple@example.com',
            'mail.mailers.smtp.password' => 'app-password',
        ]);
        Mail::fake();
    }

    #[Override]
    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    #[Test]
    public function an_authenticated_request_records_activity_throttled_to_once_per_hour(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/editions')->assertOk();
        $first = $this->fresh($user)->last_active_at;
        self::assertEquals(CarbonImmutable::now(), $first);

        CarbonImmutable::setTestNow('2026-11-20 12:30:00');
        $this->actingAs($this->fresh($user))->getJson('/api/editions')->assertOk();
        self::assertEquals($first, $this->fresh($user)->last_active_at);

        CarbonImmutable::setTestNow('2026-11-20 13:01:00');
        $this->actingAs($this->fresh($user))->getJson('/api/editions')->assertOk();
        self::assertEquals(CarbonImmutable::now(), $this->fresh($user)->last_active_at);
    }

    #[Test]
    public function an_anonymous_request_records_nothing(): void
    {
        $user = User::factory()->create();

        $this->get('/nl')->assertOk();

        self::assertNull($this->fresh($user)->last_active_at);
    }

    #[Test]
    public function a_warning_goes_out_after_23_months_with_the_deletion_date_in_the_users_language(): void
    {
        $dutch = $this->inactiveUser(23, ['name' => 'Anna', 'locale' => 'nl']);
        $english = $this->inactiveUser(23, ['name' => 'Bob', 'locale' => 'en']);
        $recent = $this->inactiveUser(22);

        $this->runCommand();

        Mail::assertSent(InactiveAccountWarning::class, 2);
        Mail::assertNotSent(InactiveAccountWarning::class, static fn (InactiveAccountWarning $mail): bool => $mail->hasTo($recent->email));

        Mail::assertSent(InactiveAccountWarning::class, static function (InactiveAccountWarning $mail) use ($dutch): bool {
            $html = $mail->render();

            return $mail->hasTo($dutch->email)
                && $mail->locale === 'nl'
                && $mail->envelope()->subject === 'Je Printopoly-account wordt verwijderd'
                && str_contains($html, 'Hoi Anna')
                && str_contains($html, 'Alle rechten voorbehouden')
                && str_contains($html, '20 december 2026')
                && str_contains($html, route('home', ['locale' => 'nl']))
                && ! str_contains($html, '—');
        });
        Mail::assertSent(InactiveAccountWarning::class, static function (InactiveAccountWarning $mail) use ($english): bool {
            $html = $mail->render();

            return $mail->hasTo($english->email)
                && $mail->locale === 'en'
                && $mail->envelope()->subject === 'Your Printopoly account will be deleted'
                && str_contains($html, 'Hi Bob')
                && str_contains($html, '20 December 2026')
                && str_contains($html, route('home', ['locale' => 'en']))
                && ! str_contains($html, '—');
        });

        $warned = $this->fresh($dutch);
        self::assertEquals(CarbonImmutable::now(), $warned->inactivity_warning_sent_at);
        self::assertSame('nl', $warned->inactivity_warning_locale);
        self::assertSame('en', $this->fresh($english)->inactivity_warning_locale);
        self::assertNull($this->fresh($recent)->inactivity_warning_sent_at);
    }

    #[Test]
    public function the_warning_is_sent_once(): void
    {
        $this->inactiveUser(23);

        $this->runCommand();
        $this->runCommand();

        Mail::assertSent(InactiveAccountWarning::class, 1);
    }

    #[Test]
    public function an_account_without_activity_data_counts_from_when_it_was_created(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['created_at' => CarbonImmutable::now()->subMonths(23)->subDay()])->save();
        $young = User::factory()->create();

        $this->runCommand();

        Mail::assertSent(InactiveAccountWarning::class, 1);
        Mail::assertSent(InactiveAccountWarning::class, static fn (InactiveAccountWarning $mail): bool => $mail->hasTo($user->email));
        self::assertNull($this->fresh($young)->inactivity_warning_sent_at);
    }

    #[Test]
    public function a_long_idle_account_is_warned_first_and_not_deleted_in_the_same_run(): void
    {
        $user = $this->inactiveUser(30);

        $this->runCommand();

        self::assertNotNull(User::query()->find($user->getKey()));
        self::assertNotNull($this->fresh($user)->inactivity_warning_sent_at);
        Mail::assertSent(InactiveAccountWarning::class, 1);
    }

    #[Test]
    public function nothing_is_deleted_with_a_warning_younger_than_30_days(): void
    {
        $user = $this->inactiveUser(24, ['inactivity_warning_sent_at' => CarbonImmutable::now()->subDays(29)]);

        $this->runCommand();

        self::assertNotNull(User::query()->find($user->getKey()));
    }

    #[Test]
    public function an_account_is_deleted_with_everything_30_days_after_the_warning(): void
    {
        $user = $this->inactiveUser(24, ['inactivity_warning_sent_at' => CarbonImmutable::now()->subDays(30)]);
        $other = User::factory()->create();
        $this->storeEdition($user);
        $this->storeEdition($other);
        EventFacade::fake([AccountDeleting::class]);

        $this->runCommand();

        self::assertNull(User::query()->find($user->getKey()));
        self::assertSame(0, Edition::query()->where('user_id', $user->publicId())->count());
        self::assertSame(1, Edition::query()->where('user_id', $other->publicId())->count());
        EventFacade::assertDispatched(AccountDeleting::class, static fn (AccountDeleting $event): bool => $event->userId === $user->publicId());
    }

    #[Test]
    public function an_account_used_after_the_warning_is_kept(): void
    {
        $user = $this->inactiveUser(24, ['inactivity_warning_sent_at' => CarbonImmutable::now()->subDays(40)]);
        $user->forceFill(['last_active_at' => CarbonImmutable::now()->subDays(35)])->save();

        $this->runCommand();

        self::assertNotNull(User::query()->find($user->getKey()));
    }

    #[Test]
    public function using_the_account_clears_the_warning_and_restarts_the_period(): void
    {
        $user = $this->inactiveUser(23);
        $this->runCommand();
        self::assertNotNull($this->fresh($user)->inactivity_warning_sent_at);

        CarbonImmutable::setTestNow('2026-12-25 09:00:00');
        $this->actingAs($this->fresh($user))->getJson('/api/editions')->assertOk();

        $fresh = $this->fresh($user);
        self::assertNull($fresh->inactivity_warning_sent_at);
        self::assertNull($fresh->inactivity_warning_locale);

        CarbonImmutable::setTestNow('2027-02-01 09:00:00');
        $this->runCommand();

        self::assertNotNull(User::query()->find($user->getKey()));
        Mail::assertSent(InactiveAccountWarning::class, 1);
    }

    #[Test]
    public function logging_in_with_google_clears_the_warning(): void
    {
        $user = $this->inactiveUser(24, ['google_id' => 'g-1', 'email' => 'anna@example.com', 'inactivity_warning_sent_at' => CarbonImmutable::now()->subDays(40), 'inactivity_warning_locale' => 'nl']);
        $googleUser = new GoogleUser()->map(['id' => 'g-1', 'name' => 'Anna', 'email' => 'anna@example.com']);

        app(LoginWithGoogle::class)->handle($googleUser, 'nl');

        $fresh = $this->fresh($user);
        self::assertEquals(CarbonImmutable::now(), $fresh->last_active_at);
        self::assertNull($fresh->inactivity_warning_sent_at);
        self::assertNull($fresh->inactivity_warning_locale);

        $this->runCommand();
        self::assertNotNull(User::query()->find($user->getKey()));
    }

    #[Test]
    public function nothing_is_warned_or_deleted_without_a_working_mail_setup(): void
    {
        config(['mail.default' => 'log']);
        Log::shouldReceive('warning')->once();
        $needsWarning = $this->inactiveUser(23);
        $warned = $this->inactiveUser(25, ['inactivity_warning_sent_at' => CarbonImmutable::now()->subDays(60)]);

        $this->runCommand();

        Mail::assertNothingSent();
        self::assertNull($this->fresh($needsWarning)->inactivity_warning_sent_at);
        self::assertNotNull(User::query()->find($warned->getKey()));
    }

    #[Test]
    public function a_failed_send_is_not_recorded_as_a_warning(): void
    {
        $user = $this->inactiveUser(23);
        // A real mailer pointed at a closed port, instead of the fake.
        config(['mail.mailers.smtp.host' => '127.0.0.1', 'mail.mailers.smtp.port' => 1]);
        app()->forgetInstance('mail.manager');
        Mail::clearResolvedInstance('mail.manager');

        $this->runCommand();

        self::assertNull($this->fresh($user)->inactivity_warning_sent_at);
        self::assertNotNull(User::query()->find($user->getKey()));
    }

    #[Test]
    public function the_command_is_scheduled_daily(): void
    {
        $events = collect(app(Schedule::class)->events())
            ->filter(static fn (Event $event): bool => str_contains((string) $event->command, 'printopoly:inactive-accounts'));

        self::assertCount(1, $events);
        self::assertSame('0 4 * * *', $events->first()?->expression);
    }

    private function runCommand(): void
    {
        Artisan::call('printopoly:inactive-accounts');
    }

    private function fresh(User $user): User
    {
        return User::query()->whereKey($user->getKey())->firstOrFail();
    }

    /**
     * @param array<string, mixed> $attributes
     */
    private function inactiveUser(int $months, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->forceFill(['last_active_at' => CarbonImmutable::now()->subMonthsNoOverflow($months)->subDay()])->save();

        return $user;
    }
}
