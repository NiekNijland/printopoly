<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Accounts\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Accounts\Actions\DeleteAccount;
use App\Modules\Accounts\Events\AccountDeletingEvent;
use Illuminate\Support\Facades\Event;
use RuntimeException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class DeleteAccountTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_account_goes_with_its_editions_and_is_logged_out(): void
    {
        Event::fake([AccountDeletingEvent::class]);
        $anna = User::factory()->createOne(['name' => 'Anna']);
        $bob = User::factory()->createOne(['name' => 'Bob']);
        Editions::store($anna, 'zaterdagclub');
        Editions::store($anna, 'molenweg');
        Editions::store($bob, 'kerkstraat');
        $this->actingAs($anna);

        resolve(DeleteAccount::class)->handle($anna);

        $this->assertGuest();
        self::assertNull(User::query()->find($anna->getKey()));
        self::assertNotNull(User::query()->find($bob->getKey()));
        self::assertSame(['kerkstraat'], Edition::query()->pluck('edition_id')->all());
        Event::assertDispatched(AccountDeletingEvent::class, static fn (AccountDeletingEvent $event): bool => $event->userId === $anna->publicId());
    }

    public function test_a_failing_listener_leaves_the_account_and_its_editions(): void
    {
        $anna = User::factory()->createOne();
        Editions::store($anna, 'zaterdagclub');
        Event::listen(AccountDeletingEvent::class, static function (): never {
            throw new RuntimeException('Opslag is onbereikbaar');
        });

        try {
            resolve(DeleteAccount::class)->handle($anna);
            self::fail('The deletion went on after a failing listener.');
        } catch (RuntimeException $runtimeException) {
            self::assertSame('Opslag is onbereikbaar', $runtimeException->getMessage());
        }

        self::assertNotNull(User::query()->find($anna->getKey()));
        self::assertSame(1, Edition::query()->count());
    }
}
