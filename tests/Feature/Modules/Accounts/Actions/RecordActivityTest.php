<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Accounts\Actions;

use App\Models\User;
use App\Modules\Accounts\Actions\RecordActivity;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class RecordActivityTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_first_use_is_written_to_the_account_and_the_model(): void
    {
        $user = User::factory()->createOne();

        resolve(RecordActivity::class)->handle($user);

        self::assertSame(now()->toDateTimeString(), $user->last_active_at?->toDateTimeString());
        self::assertSame(now()->toDateTimeString(), $user->refresh()->last_active_at?->toDateTimeString());
        self::assertFalse($user->isDirty());
    }

    public function test_use_within_the_throttle_is_not_written_again(): void
    {
        config(['printopoly.inactivity.activity_throttle_minutes' => 60]);
        $user = User::factory()->createOne();
        $user->forceFill(['last_active_at' => now()->subMinutes(59)])->save();

        resolve(RecordActivity::class)->handle($user);

        self::assertSame(now()->subMinutes(59)->toDateTimeString(), $user->refresh()->last_active_at?->toDateTimeString());
    }

    public function test_use_after_the_throttle_or_a_forced_write_moves_the_time(): void
    {
        config(['printopoly.inactivity.activity_throttle_minutes' => 60]);
        $late = User::factory()->createOne();
        $late->forceFill(['last_active_at' => now()->subMinutes(61)])->save();
        $forced = User::factory()->createOne();
        $forced->forceFill(['last_active_at' => now()->subMinutes(5)])->save();

        resolve(RecordActivity::class)->handle($late);
        resolve(RecordActivity::class)->handle($forced, force: true);

        self::assertSame(now()->toDateTimeString(), $late->refresh()->last_active_at?->toDateTimeString());
        self::assertSame(now()->toDateTimeString(), $forced->refresh()->last_active_at?->toDateTimeString());
    }

    public function test_a_pending_warning_is_cleared_even_within_the_throttle(): void
    {
        config(['printopoly.inactivity.activity_throttle_minutes' => 60]);
        $user = User::factory()->createOne();
        $user->forceFill([
            'last_active_at' => now()->subMinutes(10),
            'inactivity_warning_sent_at' => now()->subMinutes(5),
            'inactivity_warning_locale' => 'nl',
        ])->save();

        resolve(RecordActivity::class)->handle($user);

        $stored = $user->refresh();
        self::assertSame(now()->toDateTimeString(), $stored->last_active_at?->toDateTimeString());
        self::assertNull($stored->inactivity_warning_sent_at);
        self::assertNull($stored->inactivity_warning_locale);
    }
}
