<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class GoogleLoginTest extends TestCase
{
    use RefreshesMongoDatabase;

    #[Test]
    public function the_app_works_without_google_credentials(): void
    {
        $this->get('/nl')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('auth.googleLoginEnabled', false));

        $this->get('/auth/google/redirect')->assertNotFound();
        $this->get('/auth/google/callback')->assertNotFound();
    }

    #[Test]
    public function it_sends_you_to_google_when_configured(): void
    {
        $this->configureGoogle();

        $this->get('/nl')
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('auth.googleLoginEnabled', true));

        $response = $this->get('/auth/google/redirect');

        $response->assertRedirect();

        $location = (string) $response->headers->get('Location');
        self::assertStringStartsWith('https://accounts.google.com/o/oauth2/auth', $location);
        self::assertStringContainsString('scope=openid+profile+email', $location);
    }

    #[Test]
    public function the_callback_creates_an_account_and_logs_in(): void
    {
        $this->configureGoogle();
        $this->fakeGoogleUser('google-123', 'Niek', 'niek@example.com');

        $this->get('/en')->assertOk();
        $this->get('/auth/google/callback')->assertRedirect('/en');

        $user = User::query()->where('google_id', 'google-123')->firstOrFail();
        self::assertSame('Niek', $user->name);
        self::assertSame('niek@example.com', $user->email);
        self::assertSame('en', $user->locale);
        $this->assertAuthenticatedAs($user);
    }

    #[Test]
    public function the_callback_updates_an_existing_account(): void
    {
        $this->configureGoogle();
        $existing = User::factory()->create([
            'google_id' => 'google-123',
            'name' => 'Old name',
            'email' => 'old@example.com',
        ]);
        $this->fakeGoogleUser('google-123', 'New name', 'new@example.com');

        $this->get('/auth/google/callback')->assertRedirect();

        self::assertSame(1, User::query()->count());
        $existing->refresh();
        self::assertSame('New name', $existing->name);
        self::assertSame('new@example.com', $existing->email);
        $this->assertAuthenticatedAs($existing);
    }

    #[Test]
    public function a_failed_callback_says_so_and_does_not_log_in(): void
    {
        $this->configureGoogle();
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andThrow(new RuntimeException('invalid state'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->get('/auth/google/callback', ['Accept-Language' => 'nl'])
            ->assertRedirect('/nl')
            ->assertInertiaFlash('error', 'Inloggen met Google is niet gelukt. Probeer het nog een keer.');

        $this->assertGuest();
    }

    #[Test]
    public function a_logged_in_user_sees_their_name_and_can_log_out(): void
    {
        $user = User::factory()->create(['name' => 'Niek', 'locale' => 'en']);

        $this->actingAs($user)
            ->get('/nl')
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('auth.user.id', $user->id)
                ->where('auth.user.name', 'Niek')
                ->missing('auth.user.google_id'));

        $this->actingAs($user)->post('/logout')->assertRedirect('/en');
        $this->assertGuest();
    }

    #[Test]
    public function logging_out_needs_a_login(): void
    {
        $this->post('/logout')->assertRedirect('/');
    }

    private function configureGoogle(): void
    {
        config([
            'services.google.client_id' => 'client-id',
            'services.google.client_secret' => 'client-secret',
            'services.google.redirect' => 'http://localhost/auth/google/callback',
        ]);
    }

    private function fakeGoogleUser(string $id, string $name, string $email): void
    {
        $googleUser = new GoogleUser()->map([
            'id' => $id,
            'name' => $name,
            'email' => $email,
        ]);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($googleUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }
}
