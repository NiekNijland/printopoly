<?php

declare(strict_types=1);

namespace Tests\Feature\Editor;

use App\Http\Middleware\HandleInertiaRequests;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use ReflectionProperty;
use Tests\TestCase;

final class EditorRoutesTest extends TestCase
{
    private const string EDITION_ID = '0b7e6c1a-52d4-4f1b-9d3a-6f8e2c4b1a90';

    /**
     * @return iterable<string, array{string}>
     */
    public static function locales(): iterable
    {
        yield 'nl' => ['nl'];
        yield 'en' => ['en'];
    }

    #[Test]
    #[DataProvider('locales')]
    public function mijn_edities_renders_in_both_languages(string $locale): void
    {
        $this->get('/' . $locale . '/editions')
            ->assertOk()
            ->assertSee('<html lang="' . $locale . '">', false)
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/index')
                ->where('locale', $locale));
    }

    #[Test]
    #[DataProvider('locales')]
    public function the_new_edition_screen_renders(string $locale): void
    {
        $this->get('/' . $locale . '/editions/new')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/create')
                ->where('locale', $locale));
    }

    #[Test]
    #[DataProvider('locales')]
    public function the_editor_gets_the_edition_id_from_the_url(string $locale): void
    {
        $this->get('/' . $locale . '/editor/' . self::EDITION_ID)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editor/show')
                ->where('locale', $locale)
                ->where('editionId', self::EDITION_ID));
    }

    #[Test]
    public function the_language_switch_keeps_the_edition(): void
    {
        $this->get('/nl/editor/' . self::EDITION_ID)
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('localizedUrls.en', url('/en/editor/' . self::EDITION_ID)));
    }

    #[Test]
    public function an_edition_id_with_odd_characters_is_not_found(): void
    {
        $this->get('/nl/editor/short')->assertNotFound();
        $this->get('/nl/editor/' . str_repeat('a', 65))->assertNotFound();
        $this->get('/nl/editor/abcdefgh%2Fijkl')->assertNotFound();
        $this->get('/nl/editor')->assertNotFound();
    }

    #[Test]
    public function the_print_route_is_a_placeholder_until_the_print_page_exists(): void
    {
        $this->get('/nl/editions/' . self::EDITION_ID . '/print')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('placeholder')
                ->where('titleKey', 'editor.print'));

        $this->get('/nl/editions/short/print')->assertNotFound();
    }

    #[Test]
    public function the_editor_and_the_editions_are_not_server_rendered(): void
    {
        $withoutSsr = new ReflectionProperty(HandleInertiaRequests::class, 'withoutSsr')
            ->getDefaultValue();

        $this->assertIsArray($withoutSsr);

        foreach (['nl', 'en'] as $locale) {
            $this->assertContains($locale . '/editor/*', $withoutSsr);
            $this->assertContains($locale . '/editions', $withoutSsr);
            $this->assertContains($locale . '/editions/*', $withoutSsr);
        }
    }
}
