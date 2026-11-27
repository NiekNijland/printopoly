<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Accounts\Actions;

use App\Models\User;
use App\Modules\Accounts\Actions\LoginWithGoogle;
use Laravel\Socialite\Two\User as GoogleUser;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;
use UnexpectedValueException;

final class LoginWithGoogleTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_new_google_identity_becomes_an_account_in_the_language_of_the_site(): void
    {
        $googleUser = new GoogleUser()->map(['id' => 'g-anna', 'name' => 'Anna de Vries', 'email' => 'anna@example.com']);

        $user = resolve(LoginWithGoogle::class)->handle($googleUser, 'en');

        $stored = User::query()->where('google_id', 'g-anna')->firstOrFail();
        self::assertSame($stored->getKey(), $user->getKey());
        self::assertSame('Anna de Vries', $stored->name);
        self::assertSame('anna@example.com', $stored->email);
        self::assertSame('en', $stored->locale);
        self::assertSame(now()->toDateTimeString(), $stored->last_active_at?->toDateTimeString());
        $this->assertAuthenticatedAs($stored);
    }

    public function test_a_known_google_id_updates_the_account_and_keeps_its_language(): void
    {
        $existing = User::factory()->createOne(['google_id' => 'g-anna', 'name' => 'Anna', 'email' => 'oud@example.com', 'locale' => 'nl']);
        $googleUser = new GoogleUser()->map(['id' => 'g-anna', 'name' => 'Anna Bakker', 'email' => 'nieuw@example.com']);

        resolve(LoginWithGoogle::class)->handle($googleUser, 'en');

        $stored = $existing->refresh();
        self::assertSame('Anna Bakker', $stored->name);
        self::assertSame('nieuw@example.com', $stored->email);
        self::assertSame('nl', $stored->locale);
        self::assertSame(1, User::query()->count());
    }

    public function test_a_known_address_is_linked_to_the_google_id(): void
    {
        $existing = User::factory()->createOne(['google_id' => 'g-oud', 'email' => 'bob@example.com']);
        $googleUser = new GoogleUser()->map(['id' => 'g-nieuw', 'name' => null, 'email' => 'bob@example.com']);

        resolve(LoginWithGoogle::class)->handle($googleUser, 'nl');

        $stored = $existing->refresh();
        self::assertSame('g-nieuw', $stored->google_id);
        self::assertSame('bob@example.com', $stored->name, 'without a name the address is the name');
        self::assertSame(1, User::query()->count());
    }

    /**
     * @return array<string, array{array<string, string|null>}>
     */
    public static function incompleteIdentities(): array
    {
        return [
            'no id' => [['id' => '', 'name' => 'Anna', 'email' => 'anna@example.com']],
            'no address' => [['id' => 'g-anna', 'name' => 'Anna', 'email' => null]],
            'an empty address' => [['id' => 'g-anna', 'name' => 'Anna', 'email' => '']],
        ];
    }

    /**
     * @param array<string, string|null> $identity
     */
    #[DataProvider('incompleteIdentities')]
    public function test_an_identity_without_an_id_and_an_address_is_refused(array $identity): void
    {
        try {
            resolve(LoginWithGoogle::class)->handle(new GoogleUser()->map($identity), 'nl');
            self::fail('An incomplete identity logged in.');
        } catch (UnexpectedValueException $unexpectedValueException) {
            self::assertSame('Google did not return an id and e-mail address.', $unexpectedValueException->getMessage());
        }

        self::assertSame(0, User::query()->count());
        $this->assertGuest();
    }
}
