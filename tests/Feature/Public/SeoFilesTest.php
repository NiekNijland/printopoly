<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SeoFilesTest extends TestCase
{
    #[Test]
    public function the_sitemap_lists_every_page_in_both_languages_with_hreflang(): void
    {
        config(['app.url' => 'https://printopoly.nl']);

        $response = $this->get('/sitemap.xml')->assertOk();
        $this->assertStringStartsWith('application/xml', (string) $response->headers->get('Content-Type'));

        $xml = simplexml_load_string((string) $response->getContent());
        $this->assertNotFalse($xml);

        $locations = [];

        foreach ($xml->url as $url) {
            $locations[] = (string) $url->loc;
        }

        $this->assertSame([
            'https://printopoly.nl/nl',
            'https://printopoly.nl/en',
            'https://printopoly.nl/nl/printgids',
            'https://printopoly.nl/en/print-guide',
            'https://printopoly.nl/nl/vragen',
            'https://printopoly.nl/en/faq',
            'https://printopoly.nl/nl/privacy',
            'https://printopoly.nl/en/privacy',
            'https://printopoly.nl/nl/voorwaarden',
            'https://printopoly.nl/en/terms',
            'https://printopoly.nl/nl/contact',
            'https://printopoly.nl/en/contact',
        ], $locations);

        $content = (string) $response->getContent();
        $this->assertStringContainsString('<xhtml:link rel="alternate" hreflang="nl" href="https://printopoly.nl/nl/printgids"/>', $content);
        $this->assertStringContainsString('<xhtml:link rel="alternate" hreflang="en" href="https://printopoly.nl/en/print-guide"/>', $content);
        $this->assertStringContainsString('hreflang="x-default" href="https://printopoly.nl/nl/printgids"', $content);
        $this->assertStringNotContainsString('/editor', $content);
        $this->assertStringNotContainsString('/editions', $content);
    }

    #[Test]
    public function the_sitemap_has_a_lastmod_for_every_url(): void
    {
        $xml = simplexml_load_string((string) $this->get('/sitemap.xml')->getContent());
        $this->assertNotFalse($xml);

        foreach ($xml->url as $url) {
            $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', (string) $url->lastmod);
        }
    }

    #[Test]
    public function robots_txt_is_a_static_file_that_points_at_the_sitemap_and_hides_the_private_pages(): void
    {
        $robots = (string) file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('User-agent: *', $robots);
        $this->assertStringContainsString('Disallow: /*/editor/', $robots);
        $this->assertStringContainsString('Disallow: /*/editions', $robots);
        $this->assertStringContainsString('Disallow: /*/print$', $robots);
        $this->assertStringNotContainsString("Disallow: /*/print\n", $robots);
        $this->assertStringContainsString('Sitemap: https://printopoly.nl/sitemap.xml', $robots);
    }

    #[Test]
    public function security_txt_follows_rfc_9116(): void
    {
        config([
            'app.url' => 'https://printopoly.nl',
            'printopoly.contact_email' => 'hallo@printopoly.nl',
        ]);

        $response = $this->get('/.well-known/security.txt')->assertOk();

        $this->assertStringStartsWith('text/plain', (string) $response->headers->get('Content-Type'));
        $response->assertSeeHtml('Contact: mailto:hallo@printopoly.nl');
        $response->assertSeeHtml('Preferred-Languages: nl, en');
        $response->assertSeeHtml('Canonical: https://printopoly.nl/.well-known/security.txt');

        $this->assertMatchesRegularExpression(
            '/^Expires: \d{4}-\d{2}-\d{2}T00:00:00Z$/m',
            (string) $response->getContent(),
        );
    }

    #[Test]
    public function security_txt_expires_in_the_future(): void
    {
        $content = (string) $this->get('/.well-known/security.txt')->getContent();

        preg_match('/^Expires: (.+)$/m', $content, $match);

        $this->assertGreaterThan(now()->addMonths(11)->timestamp, strtotime($match[1] ?? ''));
    }
}
