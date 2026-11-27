<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class SetLocaleTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_language_in_the_path_wins_and_is_remembered_for_the_session(): void
    {
        $user = User::factory()->create(['locale' => 'nl']);

        $response = $this->actingAs($user)->get('/en/editions', ['Accept-Language' => 'nl']);

        $response->assertOk()->assertSessionHas('locale', 'en');
        $response->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('locale', 'en'));
    }

    public function test_without_a_language_in_the_path_the_account_language_comes_before_the_browser(): void
    {
        $user = User::factory()->create(['locale' => 'en']);

        $this->actingAs($user)->get('/nl/bestaat-niet', ['Accept-Language' => 'en'])->assertNotFound();
        self::assertSame('nl', app()->getLocale(), 'the fallback route reads the language from the first segment');

        $this->actingAs($user)->getJson('/api/editions', ['Accept-Language' => 'nl'])->assertOk();
        self::assertSame('en', app()->getLocale());
    }

    public function test_a_guest_without_a_language_in_the_path_gets_the_session_language_then_the_browser_then_dutch(): void
    {
        $this->withSession(['locale' => 'en'])->get('/sitemap.xml', ['Accept-Language' => 'nl']);
        self::assertSame('en', app()->getLocale());

        $this->flushSession();
        $this->get('/sitemap.xml', ['Accept-Language' => 'en-GB,en;q=0.9']);
        self::assertSame('en', app()->getLocale());

        $this->get('/sitemap.xml', ['Accept-Language' => 'de-DE']);
        self::assertSame('nl', app()->getLocale());
    }

    public function test_the_bare_domain_ignores_the_session_and_follows_the_browser(): void
    {
        $this->withSession(['locale' => 'en'])->get('/', ['Accept-Language' => 'nl'])->assertRedirect('/nl');
    }
}
