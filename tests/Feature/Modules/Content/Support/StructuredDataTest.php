<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Content\Support;

use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use App\Modules\Content\Support\ContentLibrary;
use App\Modules\Content\Support\StructuredData;
use Tests\TestCase;

final class StructuredDataTest extends TestCase
{
    public function test_every_page_names_the_organization_and_the_website(): void
    {
        config(['app.url' => 'https://printopoly.test/', 'printopoly.contact_email' => 'hallo@printopoly.test', 'seo.logo' => '/logo.png']);

        $graph = $this->graph(PublicPage::Privacy, Locale::Dutch);

        self::assertSame('Organization', $graph[0]['@type']);
        self::assertSame('https://printopoly.test/#organization', $graph[0]['@id']);
        self::assertSame(['@type' => 'ImageObject', 'url' => 'https://printopoly.test/logo.png', 'width' => 512, 'height' => 512], $graph[0]['logo']);
        self::assertIsArray($graph[0]['contactPoint']);
        self::assertSame('hallo@printopoly.test', $graph[0]['contactPoint']['email']);
        self::assertSame('WebSite', $graph[1]['@type']);
        self::assertSame(['nl', 'en'], $graph[1]['inLanguage']);
    }

    public function test_a_content_page_has_its_seo_title_a_breadcrumb_and_its_last_change(): void
    {
        config(['app.url' => 'https://printopoly.test', 'seo.lastmod' => ['privacy' => '2026-03-01']]);
        $content = resolve(ContentLibrary::class)->page('privacy', Locale::English);

        $graph = $this->graph(PublicPage::Privacy, Locale::English);

        self::assertCount(4, $graph);
        self::assertSame('WebPage', $graph[2]['@type']);
        self::assertSame('https://printopoly.test/en/privacy', $graph[2]['url']);
        self::assertSame($content->seoTitle, $graph[2]['name']);
        self::assertSame($content->description, $graph[2]['description']);
        self::assertSame('en', $graph[2]['inLanguage']);
        self::assertSame('2026-03-01', $graph[2]['dateModified']);
        self::assertSame(['@id' => 'https://printopoly.test/en/privacy#breadcrumb'], $graph[2]['breadcrumb']);
        self::assertSame('BreadcrumbList', $graph[3]['@type']);
        self::assertSame([
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Printopoly', 'item' => 'https://printopoly.test/en'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => $content->seoTitle, 'item' => 'https://printopoly.test/en/privacy'],
        ], $graph[3]['itemListElement']);
    }

    public function test_a_page_without_a_last_change_uses_today(): void
    {
        config(['seo.lastmod' => []]);

        self::assertSame(now()->toDateString(), $this->graph(PublicPage::Terms, Locale::Dutch)[2]['dateModified']);
    }

    public function test_the_home_page_is_about_the_free_app_and_answers_the_home_questions(): void
    {
        config(['app.url' => 'https://printopoly.test']);
        $landing = resolve(ContentLibrary::class)->landing(Locale::Dutch);

        $graph = $this->graph(PublicPage::Home, Locale::Dutch);

        self::assertCount(5, $graph);
        self::assertSame($landing['meta.title'] ?? 'Printopoly', $graph[2]['name']);
        self::assertSame(['@id' => 'https://printopoly.test/#app'], $graph[2]['about']);
        self::assertArrayNotHasKey('breadcrumb', $graph[2]);
        self::assertSame('WebApplication', $graph[3]['@type']);
        self::assertTrue($graph[3]['isAccessibleForFree']);
        self::assertSame(['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'EUR'], $graph[3]['offers']);
        self::assertSame('FAQPage', $graph[4]['@type']);
        self::assertIsArray($graph[4]['mainEntity']);
        self::assertCount(5, $graph[4]['mainEntity']);
    }

    public function test_the_faq_page_lists_every_question_with_its_answer(): void
    {
        $faq = resolve(ContentLibrary::class)->faq(Locale::English);

        $graph = $this->graph(PublicPage::Faq, Locale::English);

        self::assertSame('FAQPage', $graph[4]['@type']);
        self::assertIsArray($graph[4]['mainEntity']);
        self::assertCount(count($faq), $graph[4]['mainEntity']);
        self::assertSame([
            '@type' => 'Question',
            'name' => $faq[0]->question,
            'acceptedAnswer' => ['@type' => 'Answer', 'text' => $faq[0]->answerHtml],
        ], $graph[4]['mainEntity'][0]);
    }

    public function test_the_print_guide_is_an_article_and_contact_a_contact_page(): void
    {
        config(['app.url' => 'https://printopoly.test']);

        $guide = $this->graph(PublicPage::PrintGuide, Locale::Dutch);
        $contact = $this->graph(PublicPage::Contact, Locale::English);

        self::assertSame('Article', $guide[4]['@type']);
        self::assertSame('https://printopoly.test/nl/printgids#article', $guide[4]['@id']);
        self::assertSame('https://printopoly.test/og/og-nl.png', $guide[4]['image']);
        self::assertSame($guide[2]['name'], $guide[4]['headline']);
        self::assertCount(4, $contact);
        self::assertSame('ContactPage', $contact[2]['@type']);
        self::assertSame(__('contact.title', [], 'en'), $contact[2]['name']);
        self::assertSame(__('contact.description', [], 'en'), $contact[2]['description']);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function graph(PublicPage $page, Locale $locale): array
    {
        $data = resolve(StructuredData::class)->forPage($page, $locale);
        self::assertSame('https://schema.org', $data['@context']);
        $graph = $data['@graph'];
        self::assertIsArray($graph);
        $rows = [];

        foreach ($graph as $row) {
            self::assertIsArray($row);
            $rows[] = array_combine(array_map(strval(...), array_keys($row)), $row);
        }

        return $rows;
    }
}
