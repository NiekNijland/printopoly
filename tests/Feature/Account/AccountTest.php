<?php

declare(strict_types=1);

namespace Tests\Feature\Account;

use App\Events\AccountDeleting;
use App\Models\Edition;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\Concerns\MakesEditions;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class AccountTest extends TestCase
{
    use MakesEditions;
    use RefreshesMongoDatabase;

    #[Test]
    public function logging_out_tells_a_json_caller_to_clear_the_local_copy(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/logout')
            ->assertOk()
            ->assertJsonPath('clearLocalCopy', true);

        $this->assertGuest();
    }

    #[Test]
    public function logging_out_flashes_clear_local_copy_to_the_page_it_lands_on(): void
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

    #[Test]
    public function logging_out_keeps_the_editions_in_the_account(): void
    {
        $user = User::factory()->create();
        $this->storeEdition($user, 'e1');

        $this->actingAs($user)->postJson('/logout')->assertOk();

        self::assertSame(1, Edition::query()->count());
        self::assertSame(1, User::query()->count());
    }

    #[Test]
    public function logging_out_needs_a_login(): void
    {
        $this->postJson('/logout')->assertUnauthorized();
    }

    #[Test]
    public function deleting_an_account_needs_a_login(): void
    {
        $this->deleteJson('/api/account', ['confirmation' => 'x@example.com'])->assertUnauthorized();
    }

    #[Test]
    public function deleting_an_account_removes_the_user_and_their_editions_only(): void
    {
        Event::fake([AccountDeleting::class]);
        $user = User::factory()->create(['email' => 'niek@example.com']);
        $other = User::factory()->create();
        $this->storeEdition($user, 'e1');
        $this->storeEdition($user, 'e2');
        $this->storeEdition($other, 'e3');

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
        Event::assertDispatched(AccountDeleting::class, fn (AccountDeleting $event): bool => $event->userId === $user->publicId());
    }

    #[Test]
    public function the_server_checks_the_confirmation(): void
    {
        $user = User::factory()->create(['email' => 'niek@example.com']);
        $this->storeEdition($user, 'e1');

        $this->actingAs($user)->deleteJson('/api/account', [])->assertUnprocessable();
        $this->actingAs($user)->deleteJson('/api/account', ['confirmation' => 'wrong@example.com'])->assertUnprocessable();
        $this->actingAs($user)->deleteJson('/api/account', ['confirmation' => true])->assertUnprocessable();

        self::assertNotNull(User::query()->find($user->getKey()));
        self::assertSame(1, Edition::query()->count());
    }

    #[Test]
    public function a_listener_that_fails_stops_the_deletion(): void
    {
        $user = User::factory()->create(['email' => 'niek@example.com']);
        $this->storeEdition($user, 'e1');
        Event::listen(AccountDeleting::class, static function (): never {
            throw new RuntimeException('R2 is down');
        });

        $this->actingAs($user)->withoutExceptionHandling();

        try {
            $this->deleteJson('/api/account', ['confirmation' => 'niek@example.com']);
            self::fail('The deletion should have stopped.');
        } catch (RuntimeException $exception) {
            self::assertSame('R2 is down', $exception->getMessage());
        }

        self::assertNotNull(User::query()->find($user->getKey()));
        self::assertSame(1, Edition::query()->count());
    }
}
