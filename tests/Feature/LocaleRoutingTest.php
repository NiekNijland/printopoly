<?php

declare(strict_types=1);

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class LocaleRoutingTest extends TestCase
{
    #[Test]
    public function the_root_redirects_to_dutch_without_a_supported_browser_language(): void
    {
        $this->get('/', ['Accept-Language' => ''])
            ->assertRedirect('/nl')
            ->assertHeaderContains('Vary', 'Accept-Language');
    }

    #[Test]
    public function the_root_follows_the_browser_language(): void
    {
        $this->get('/', ['Accept-Language' => 'en-GB,en;q=0.9'])->assertRedirect('/en');
        $this->get('/', ['Accept-Language' => 'de-DE,nl;q=0.8'])->assertRedirect('/nl');
        $this->get('/', ['Accept-Language' => 'fr-FR'])->assertRedirect('/nl');
    }

    #[Test]
    public function the_root_keeps_the_query_string(): void
    {
        $this->get('/?ref=groepsapp', ['Accept-Language' => 'en'])->assertRedirect('/en?ref=groepsapp');
    }

    #[Test]
    public function the_home_page_renders_in_each_language(): void
    {
        $this->get('/nl')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('home')
                ->where('locale', 'nl')
                ->where('locales', ['nl', 'en'])
                ->where('localizedUrls.nl', url('/nl'))
                ->where('localizedUrls.en', url('/en'))
                ->where('auth.user', null)
                ->where('auth.googleLoginEnabled', false));

        $this->get('/en')
            ->assertOk()
            ->assertSee('<html lang="en">', false)
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('home')
                ->where('locale', 'en'));
    }

    #[Test]
    public function an_unknown_language_is_not_found(): void
    {
        $this->get('/de')->assertNotFound();
    }

    #[Test]
    public function the_language_switch_points_at_the_same_page(): void
    {
        $this->get('/nl/editions?tab=bord')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/index')
                ->where('localizedUrls.en', url('/en/editions?tab=bord')));
    }

    #[Test]
    public function the_root_ignores_the_last_browsed_language(): void
    {
        $this->get('/en')->assertOk();

        // The root ignores the session and follows the browser (B46).
        $this->get('/', ['Accept-Language' => 'nl'])->assertRedirect('/nl');
    }
}
