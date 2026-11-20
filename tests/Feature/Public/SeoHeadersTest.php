<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Enums\Locale;
use App\Enums\PublicPage;
use App\Http\Middleware\RedirectTrailingSlash;
use App\Support\StructuredData;
use Illuminate\Http\Request;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

final class SeoHeadersTest extends TestCase
{
    #[Test]
    public function a_trailing_slash_redirects_permanently_to_the_clean_url(): void
    {
        // The test client trims slashes itself, so the middleware gets a request as nginx would pass it.
        $request = Request::create('http://localhost/nl/printgids/?a=1');
        $request->server->set('REQUEST_URI', '/nl/printgids/?a=1');

        $response = new RedirectTrailingSlash()->handle($request, static fn (): Response => new Response('next'));

        $this->assertSame(301, $response->getStatusCode());
        $this->assertSame('http://localhost/nl/printgids?a=1', $response->headers->get('Location'));

        $clean = new RedirectTrailingSlash()->handle(Request::create('http://localhost/nl/printgids'), static fn (): Response => new Response('next'));

        $this->assertSame(200, $clean->getStatusCode());
    }

    #[Test]
    public function every_response_carries_the_security_headers(): void
    {
        $response = $this->get('/nl')->assertOk();

        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertSame('SAMEORIGIN', $response->headers->get('X-Frame-Options'));
        $this->assertStringContainsString('max-age=31536000', (string) $response->headers->get('Strict-Transport-Security'));
        $this->assertSame('strict-origin-when-cross-origin', $response->headers->get('Referrer-Policy'));
    }

    #[Test]
    public function public_pages_are_indexable_and_name_their_language(): void
    {
        $response = $this->get('/en/faq')->assertOk();

        $this->assertNull($response->headers->get('X-Robots-Tag'));
        $this->assertSame('en', $response->headers->get('Content-Language'));
        $response->assertDontSee('<meta name="robots" content="noindex', false);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function privatePages(): iterable
    {
        yield 'editions' => ['/nl/editions'];
        yield 'new edition' => ['/nl/editions/new'];
        yield 'sample' => ['/en/editions/sample'];
        yield 'editor' => ['/nl/editor/abcdefgh12'];
        yield 'print start' => ['/en/print'];
        yield 'unknown url' => ['/nl/bestaat-niet'];
    }

    #[Test]
    #[DataProvider('privatePages')]
    public function private_pages_and_errors_are_noindex(string $url): void
    {
        $response = $this->get($url);

        $this->assertSame('noindex, nofollow', $response->headers->get('X-Robots-Tag'));
        $response->assertSee('<meta name="robots" content="noindex, nofollow">', false);
    }

    #[Test]
    public function an_unknown_url_is_a_404_page_in_the_language_of_the_path(): void
    {
        $this->get('/en/nope')
            ->assertNotFound()
            ->assertSee('<html lang="en">', false)
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('error')
                ->where('status', 404)
                ->where('locale', 'en')
                ->where('seo', null));

        $this->get('/nl/nope')->assertNotFound()->assertSee('<html lang="nl">', false);
    }

    #[Test]
    public function the_structured_data_covers_organization_website_breadcrumb_and_faq(): void
    {
        $faq = $this->graph(PublicPage::Faq, Locale::Dutch);

        $this->assertSame(['Organization', 'WebSite', 'WebPage', 'BreadcrumbList', 'FAQPage'], array_column($faq, '@type'));
        $this->assertNotEmpty($faq[4]['mainEntity'] ?? null);

        $this->assertContains('Article', array_column($this->graph(PublicPage::PrintGuide, Locale::English), '@type'));

        $home = array_column($this->graph(PublicPage::Home, Locale::Dutch), '@type');

        $this->assertContains('WebApplication', $home);
        $this->assertContains('FAQPage', $home);
        $this->assertNotContains('BreadcrumbList', $home);
    }

    #[Test]
    public function the_page_data_reaches_the_inertia_props(): void
    {
        $this->get('/nl/vragen')->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('seo.jsonLd.@graph.0.@type', 'Organization')
            ->where('seo.ogImageWidth', 1200)
            ->where('seo.ogImageHeight', 630));
    }

    #[Test]
    public function every_public_page_has_a_lastmod_a_unique_title_and_a_description_of_sane_length(): void
    {
        foreach (PublicPage::cases() as $page) {
            $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $this->text(config('seo.lastmod.' . $page->value)));
        }

        foreach (Locale::cases() as $locale) {
            $titles = [];

            foreach (PublicPage::cases() as $page) {
                $webPage = $this->graph($page, $locale)[2];
                $description = $this->text($webPage['description'] ?? null);
                $name = $this->text($webPage['name'] ?? null);

                $this->assertLessThanOrEqual(160, mb_strlen($description), $page->value);
                $this->assertGreaterThanOrEqual(90, mb_strlen($description), $page->value);
                $this->assertLessThanOrEqual(70, mb_strlen($name), $page->value);
                $titles[] = $name;
            }

            $this->assertSame($titles, array_values(array_unique($titles)));
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function graph(PublicPage $page, Locale $locale): array
    {
        $graph = app(StructuredData::class)->forPage($page, $locale)['@graph'] ?? [];
        $nodes = [];

        foreach (is_array($graph) ? $graph : [] as $node) {
            if (is_array($node)) {
                $nodes[] = array_filter($node, is_string(...), ARRAY_FILTER_USE_KEY);
            }
        }

        return $nodes;
    }

    private function text(mixed $value): string
    {
        return is_string($value) ? $value : '';
    }
}
