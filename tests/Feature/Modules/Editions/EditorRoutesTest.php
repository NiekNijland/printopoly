<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions;

use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Vite;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class EditorRoutesTest extends TestCase
{
    private const string RELEASE = '0dad59b4-1978-4741-bf8e-6a56d9370ca8';

    private const string EDITION_ID = '0b7e6c1a-52d4-4f1b-9d3a-6f8e2c4b1a90';

    /**
     * @return iterable<string, array{string}>
     */
    public static function locales(): iterable
    {
        yield 'nl' => ['nl'];
        yield 'en' => ['en'];
    }

    public function test_pages_do_not_prefetch_every_other_chunk(): void
    {
        // The test case fakes Vite, so render the tags of a real instance after the provider has booted: a
        // prefetch strategy would load heic-to and the editor chunks on Nieuwe editie.
        $this->app->forgetInstance(Vite::class);
        Facade::clearResolvedInstance(Vite::class);
        new AppServiceProvider($this->app)->boot();
        $build = storage_path('framework/testing/vite-' . Str::random(8));
        File::ensureDirectoryExists($build . '/build');
        File::put($build . '/build/manifest.json', json_encode([
            'resources/js/app.tsx' => ['file' => 'assets/app.js', 'src' => 'resources/js/app.tsx', 'isEntry' => true, 'dynamicImports' => ['resources/js/pages/editor.tsx']],
            'resources/js/pages/editor.tsx' => ['file' => 'assets/editor.js', 'src' => 'resources/js/pages/editor.tsx', 'isDynamicEntry' => true],
        ], JSON_THROW_ON_ERROR));
        $tags = static fn (Vite $vite): string => $vite->useHotFile($build . '/hot')->useBuildDirectory('build')
            ->useManifestFilename('manifest.json')
            ->__invoke('resources/js/app.tsx')
            ->toHtml();
        $this->app->usePublicPath($build);

        $booted = $tags($this->app->make(Vite::class));
        $prefetching = $tags(new Vite()->prefetch());
        File::deleteDirectory($build);

        self::assertStringContainsString('app.js', $booted);
        self::assertStringNotContainsString('editor.js', $booted);
        self::assertStringContainsString('editor.js', $prefetching);
    }

    #[DataProvider('locales')]
    public function test_mijn_edities_renders_in_both_languages(string $locale): void
    {
        $this->get('/' . $locale . '/editions')->assertOk()->assertSeeHtml('<html lang="' . $locale . '">')
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/index')
                ->where('locale', $locale));
    }

    #[DataProvider('locales')]
    public function test_the_sample_edition_renders_read_only_in_both_languages(string $locale): void
    {
        $this->get('/' . $locale . '/editions/sample')->assertOk()->assertSeeHtml('<html lang="' . $locale . '">')
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/sample')
                ->where('locale', $locale));
    }

    #[DataProvider('locales')]
    public function test_the_new_edition_screen_renders(string $locale): void
    {
        $this->get('/' . $locale . '/editions/new')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/create')
                ->where('locale', $locale));
    }

    #[DataProvider('locales')]
    public function test_the_editor_gets_the_edition_id_from_the_url(string $locale): void
    {
        $this->get('/' . $locale . '/editor/' . self::EDITION_ID)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editor/show')
                ->where('locale', $locale)
                ->where('editionId', self::EDITION_ID));
    }

    public function test_the_language_switch_keeps_the_edition(): void
    {
        $this->get('/nl/editor/' . self::EDITION_ID)
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('localizedUrls.en', url('/en/editor/' . self::EDITION_ID)));
    }

    public function test_an_edition_id_with_odd_characters_is_not_found(): void
    {
        $this->get('/nl/editor/short')->assertNotFound();
        $this->get('/nl/editor/' . str_repeat('a', 65))->assertNotFound();
        $this->get('/nl/editor/abcdefgh%2Fijkl')->assertNotFound();
        $this->get('/nl/editor')->assertNotFound();
    }

    public function test_the_print_route_opens_the_print_page_for_an_edition_of_this_browser(): void
    {
        $this->get('/nl/editions/' . self::EDITION_ID . '/print')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('print/show')
                ->where('job', null)
                ->where('localEditionId', self::EDITION_ID));

        $this->get('/nl/editions/short/print')->assertNotFound();
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function clientOnlyPages(): iterable
    {
        foreach (['nl', 'en'] as $locale) {
            yield $locale . ' editor' => ['/' . $locale . '/editor/' . self::EDITION_ID];
            yield $locale . ' editions' => ['/' . $locale . '/editions'];
            yield $locale . ' new edition' => ['/' . $locale . '/editions/new'];
        }
    }

    #[DataProvider('clientOnlyPages')]
    public function test_the_editor_and_the_editions_are_not_server_rendered(string $url): void
    {
        $public = storage_path('framework/testing/ssr-' . Str::random(8));
        File::ensureDirectoryExists($public . '/build');
        File::put($public . '/build/ssr-release.json', json_encode(['id' => self::RELEASE], JSON_THROW_ON_ERROR));
        $this->app->usePublicPath($public);
        config(['inertia.ssr.enabled' => true, 'inertia.ssr.ensure_bundle_exists' => false]);
        Http::fake(['*' => Http::response(['head' => [], 'body' => '<div>ssr</div>', 'release' => self::RELEASE])]);

        $this->get('/nl')->assertOk();
        $home = Http::recorded()->count();
        $this->get($url)->assertOk();
        File::deleteDirectory($public);

        self::assertSame(1, $home);
        self::assertSame(1, Http::recorded()->count());
    }
}
