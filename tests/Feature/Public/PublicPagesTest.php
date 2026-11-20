<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Content\ContentLibrary;
use App\Enums\Locale;
use App\Enums\PublicPage;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class PublicPagesTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string, string, string}>
     */
    public static function pages(): iterable
    {
        yield 'home nl' => ['/nl', 'home', 'nl', '/nl'];
        yield 'home en' => ['/en', 'home', 'en', '/nl'];
        yield 'print guide nl' => ['/nl/printgids', 'print-guide', 'nl', '/nl/printgids'];
        yield 'print guide en' => ['/en/print-guide', 'print-guide', 'en', '/nl/printgids'];
        yield 'faq nl' => ['/nl/vragen', 'faq', 'nl', '/nl/vragen'];
        yield 'faq en' => ['/en/faq', 'faq', 'en', '/nl/vragen'];
        yield 'privacy nl' => ['/nl/privacy', 'document', 'nl', '/nl/privacy'];
        yield 'privacy en' => ['/en/privacy', 'document', 'en', '/nl/privacy'];
        yield 'terms nl' => ['/nl/voorwaarden', 'document', 'nl', '/nl/voorwaarden'];
        yield 'terms en' => ['/en/terms', 'document', 'en', '/nl/voorwaarden'];
        yield 'contact nl' => ['/nl/contact', 'contact', 'nl', '/nl/contact'];
        yield 'contact en' => ['/en/contact', 'contact', 'en', '/nl/contact'];
    }

    #[Test]
    #[DataProvider('pages')]
    public function every_public_page_renders_in_its_language(string $url, string $component, string $locale, string $dutchPath): void
    {
        $this->get($url)
            ->assertOk()
            ->assertSee('<html lang="' . $locale . '">', false)
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component($component)
                ->where('locale', $locale)
                ->where('seo.canonical', PublicPage::origin() . $url)
                ->where('seo.alternates.x-default', PublicPage::origin() . $dutchPath));
    }

    #[Test]
    public function the_other_languages_slug_is_not_found(): void
    {
        $this->get('/nl/print-guide')->assertNotFound();
        $this->get('/en/printgids')->assertNotFound();
        $this->get('/en/voorwaarden')->assertNotFound();
    }

    #[Test]
    public function the_landing_page_carries_the_texts_of_landing_json_and_five_questions(): void
    {
        $content = $this->app->make(ContentLibrary::class);

        $this->assertSame('Maak het handelsspel met jullie eigen straten.', $content->landing(Locale::Dutch)['hero.title'] ?? null);
        $this->assertSame('Make an edition', $content->landing(Locale::English)['hero.cta.primary'] ?? null);

        $this->get('/nl')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('strings', $content->landing(Locale::Dutch))
            ->has('faq', 5)
            ->where('faq.0.question', 'Wat kost het?')
            ->where('faq.4.question', 'Hoort Printopoly bij Hasbro?'));

        $this->get('/en')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('strings', $content->landing(Locale::English))
            ->has('faq', 5));
    }

    #[Test]
    public function the_print_guide_has_one_section_per_part_rendered_as_html(): void
    {
        $this->get('/nl/printgids')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('document.title', 'Printgids')
            ->where('document.sections.0.id', 'eerst-het-proefvel')
            ->where('document.sections.1.title', 'Thuis printen: wat je nodig hebt')
            ->where('document.sections.2.title', 'Bord')
            ->where('document.sections.2.id', 'bord')
            ->where('document.sections.2.blocks.0.title', 'Bij de drukkerij')
            ->where('document.sections.2.blocks.0.spec', '4 stuks · elk 248 × 248 mm · 3 mm afloop (pagina 254 × 254 mm)')
            ->where('document.sections.2.blocks.1.title', 'Thuis')
            ->has('document.sections.2.blocks.2.steps', 4)
            ->where('document.sections.2.html', fn (mixed $html): bool => is_string($html) && ! str_contains($html, '<h3>'))
            ->where('document.introHtml', fn (mixed $html): bool => is_string($html) && str_starts_with($html, '<p>'))
            ->where('document.description', fn (mixed $description): bool => is_string($description) && $description !== ''));

        $this->get('/en/print-guide')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('document.title', 'Print guide')
            ->where('document.sections.0.id', 'start-with-the-proof-sheet'));
    }

    #[Test]
    public function privacy_and_terms_keep_their_placeholders(): void
    {
        $this->get('/nl/privacy')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('document.title', 'Privacyverklaring')
            ->where('document.sections.0.html', fn (mixed $html): bool => is_string($html) && str_contains($html, 'hallo@printopoly.nl')));

        $this->get('/nl/voorwaarden')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('document.title', 'Voorwaarden')
            ->where('document.introHtml', fn (mixed $html): bool => is_string($html) && str_contains($html, 'hobby')));
    }

    #[Test]
    public function raw_html_in_content_is_stripped(): void
    {
        $html = $this->app->make(ContentLibrary::class)
            ->page('printgids', Locale::Dutch)
            ->introHtml;

        $this->assertStringNotContainsString('<script', $html);
    }

    #[Test]
    public function the_contact_page_shows_the_configured_address(): void
    {
        $this->get('/nl/contact')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('contactEmail', 'hallo@printopoly.nl'));

        config(['printopoly.contact_email' => 'test@printopoly.nl']);

        $this->get('/en/contact')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('contactEmail', 'test@printopoly.nl'));
    }

    #[Test]
    public function the_language_switch_links_to_the_slug_of_the_other_language(): void
    {
        $this->get('/nl/printgids?x=1')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('localizedUrls.nl', url('/nl/printgids?x=1'))
            ->where('localizedUrls.en', url('/en/print-guide?x=1')));

        $this->get('/en/terms')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('localizedUrls.nl', url('/nl/voorwaarden')));
    }

    #[Test]
    public function the_header_and_footer_links_use_the_slugs_of_the_current_language(): void
    {
        $this->get('/en')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('pageUrls.printGuide', '/en/print-guide')
            ->where('pageUrls.faq', '/en/faq')
            ->where('pageUrls.privacy', '/en/privacy')
            ->where('pageUrls.terms', '/en/terms')
            ->where('pageUrls.contact', '/en/contact'));

        $this->get('/nl')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('pageUrls.printGuide', '/nl/printgids')
            ->where('pageUrls.terms', '/nl/voorwaarden'));
    }

    #[Test]
    public function seo_data_has_canonical_hreflang_and_a_static_og_image_per_language(): void
    {
        config(['app.url' => 'https://printopoly.nl']);

        $this->get('/en/print-guide?utm_source=x')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('seo.canonical', 'https://printopoly.nl/en/print-guide')
            ->where('seo.alternates.nl', 'https://printopoly.nl/nl/printgids')
            ->where('seo.alternates.en', 'https://printopoly.nl/en/print-guide')
            ->where('seo.alternates.x-default', 'https://printopoly.nl/nl/printgids')
            ->where('seo.ogImage', 'https://printopoly.nl/og/og-en.png')
            ->where('seo.ogLocale', 'en_GB')
            ->where('seo.alternateLocales', ['nl_NL']));

        $this->get('/nl')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('seo.canonical', 'https://printopoly.nl/nl')
            ->where('seo.ogImage', 'https://printopoly.nl/og/og-nl.png'));
    }

    #[Test]
    public function the_editor_and_the_editions_have_no_seo_data(): void
    {
        $this->get('/nl/editor/0b7e6c1a-52d4-4f1b-9d3a-6f8e2c4b1a90')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('seo', null));

        $this->get('/nl/editions')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('seo', null));
    }

    #[Test]
    public function the_og_images_exist(): void
    {
        $this->assertFileExists(public_path('og/og-nl.png'));
        $this->assertFileExists(public_path('og/og-en.png'));
    }
}
