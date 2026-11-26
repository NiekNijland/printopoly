<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Accounts;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Accounts\Events\AccountDeletingEvent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Inertia\Testing\AssertableInertia;
use RuntimeException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class AccountTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_logging_out_tells_a_json_caller_to_clear_the_local_copy(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/logout')
            ->assertOk()
            ->assertJsonPath('clearLocalCopy', true);

        $this->assertGuest();
    }

    public function test_logging_out_flashes_clear_local_copy_to_the_page_it_lands_on(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/logout')
            ->assertRedirect('/nl')
            ->assertInertiaFlash('clearLocalCopy', true);

        $this->assertGuest();
        $this->get('/nl')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('auth.user', null));
    }

    public function test_logging_out_keeps_the_editions_in_the_account(): void
    {
        $user = User::factory()->create();
        Editions::store($user, 'e1');

        $this->actingAs($user)->postJson('/logout')->assertOk();

        self::assertSame(1, Edition::query()->count());
        self::assertSame(1, User::query()->count());
    }

    public function test_logging_out_needs_a_login(): void
    {
        $this->postJson('/logout')->assertUnauthorized();
    }

    public function test_deleting_an_account_needs_a_login(): void
    {
        $this->deleteJson('/api/account', ['confirmation' => 'x@example.com'])->assertUnauthorized();
    }

    public function test_deleting_an_account_removes_the_user_and_their_editions_only(): void
    {
        Event::fake([AccountDeletingEvent::class]);
        $user = User::factory()->create(['email' => 'niek@example.com']);
        $other = User::factory()->create();
        Editions::store($user, 'e1');
        Editions::store($user, 'e2');
        Editions::store($other, 'e3');

        $this->actingAs($user)
            ->deleteJson('/api/account', ['confirmation' => ' Niek@Example.com '])
            ->assertOk()
            ->assertJsonPath('deleted', true)
            ->assertJsonPath('redirect', url('/nl'));

        $this->assertGuest();
        self::assertNull(User::query()->find($user->getKey()));
        self::assertSame(0, Edition::query()->where('user_id', $user->publicId())->count());
        self::assertSame(['e3'], Edition::query()->pluck('edition_id')->all());
        self::assertNotNull(User::query()->find($other->getKey()));
        Event::assertDispatched(AccountDeletingEvent::class, fn (AccountDeletingEvent $event): bool => $event->userId === $user->publicId());
    }

    public function test_the_server_checks_the_confirmation(): void
    {
        $user = User::factory()->create(['email' => 'niek@example.com']);
        Editions::store($user, 'e1');

        $this->actingAs($user)->deleteJson('/api/account', [])->assertUnprocessable();
        $this->actingAs($user)->deleteJson('/api/account', ['confirmation' => 'wrong@example.com'])->assertUnprocessable();
        $this->actingAs($user)->deleteJson('/api/account', ['confirmation' => true])->assertUnprocessable();

        self::assertNotNull(User::query()->find($user->getKey()));
        self::assertSame(1, Edition::query()->count());
    }

    public function test_a_listener_that_fails_stops_the_deletion(): void
    {
        $user = User::factory()->create(['email' => 'niek@example.com']);
        Editions::store($user, 'e1');
        Event::listen(AccountDeletingEvent::class, static function (): never {
            throw new RuntimeException('R2 is down');
        });

        Exceptions::fake([RuntimeException::class]);

        $this->actingAs($user)->deleteJson('/api/account', ['confirmation' => 'niek@example.com'])->assertInternalServerError();

        Exceptions::assertReported(static fn (RuntimeException $exception): bool => $exception->getMessage() === 'R2 is down');
        self::assertNotNull(User::query()->find($user->getKey()));
        self::assertSame(1, Edition::query()->count());
    }
}
