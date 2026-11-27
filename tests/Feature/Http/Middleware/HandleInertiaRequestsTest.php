<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Models\User;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class HandleInertiaRequestsTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_every_page_shares_the_name_the_languages_and_the_page_links_of_its_language(): void
    {
        config(['app.name' => 'Printopoly']);

        $this->get('/en/editions')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('name', 'Printopoly')
                ->where('locale', 'en')
                ->where('locales', ['nl', 'en'])
                ->where('pageUrls', [
                    'printGuide' => '/en/print-guide',
                    'faq' => '/en/faq',
                    'privacy' => '/en/privacy',
                    'terms' => '/en/terms',
                    'contact' => '/en/contact',
                ])
                ->where('seo', null)
                ->where('auth.user', null));
    }

    public function test_a_public_page_shares_its_seo_data_with_the_structured_data(): void
    {
        $this->get('/nl/vragen')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('pageUrls.faq', '/nl/vragen')
                ->has('seo')
                ->where('seo.jsonLd.@context', 'https://schema.org'));
    }

    public function test_a_logged_in_user_and_a_configured_google_login_are_shared(): void
    {
        config(['services.google.client_id' => 'printopoly-client', 'services.google.client_secret' => 'geheim']);
        $user = User::factory()->create(['name' => 'Sanne de Vries']);

        $this->actingAs($user)->get('/nl/editions')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('auth.user.name', 'Sanne de Vries')
                ->where('auth.googleLoginEnabled', true));
    }

    public function test_a_public_page_is_rendered_on_the_server_and_a_private_page_is_not(): void
    {
        $release = '0dad59b4-1978-4741-bf8e-6a56d9370ca8';
        $public = storage_path('framework/testing/ssr-' . Str::random(8));
        $this->app->usePublicPath($public);
        File::ensureDirectoryExists($public . '/build');
        File::put($public . '/build/ssr-release.json', json_encode(['id' => $release], JSON_THROW_ON_ERROR));
        config(['inertia.ssr.enabled' => true, 'inertia.ssr.ensure_bundle_exists' => false]);
        Http::fake(['*' => Http::response(['head' => [], 'body' => '<div id="ssr">vragen</div>', 'release' => $release])]);

        $faq = $this->get('/nl/vragen');
        $editions = $this->get('/nl/editions');
        File::deleteDirectory($public);

        $faq->assertOk()->assertSeeHtml('<div id="ssr">vragen</div>');
        $editions->assertOk()->assertDontSeeHtml('<div id="ssr">');
        Http::assertSentCount(1);
    }
}
