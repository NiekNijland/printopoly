<?php

declare(strict_types=1);

namespace App\Modules\Content\Support;

use App\Modules\Content\Data\FaqItemData;
use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;

/**
 * The JSON-LD of a public page, as one @graph (B66): the site's Organization
 * and WebSite, the page itself with its breadcrumb, and what the page is
 * about (the app on the landing page, the questions on the FAQ, an article
 * for the print guide).
 */
final readonly class StructuredData
{
    public function __construct(private ContentLibrary $content)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function forPage(PublicPage $page, Locale $locale): array
    {
        $origin = PublicPage::origin();
        $url = $page->absoluteUrl($locale);
        [$title, $description] = $this->titleAndDescription($page, $locale);
        $modified = $this->modified($page);

        $webPage = [
            '@type' => $page === PublicPage::Contact ? 'ContactPage' : 'WebPage',
            '@id' => $url . '#webpage',
            'url' => $url,
            'name' => $title,
            'description' => $description,
            'inLanguage' => $locale->value,
            'isPartOf' => ['@id' => $origin . '/#website'],
            'publisher' => ['@id' => $origin . '/#organization'],
            'dateModified' => $modified,
        ];

        $graph = [$this->organization($origin), $this->website($origin)];

        if ($page !== PublicPage::Home) {
            $webPage['breadcrumb'] = ['@id' => $url . '#breadcrumb'];
            $graph[] = $webPage;
            $graph[] = $this->breadcrumb($page, $locale, $title);
        } else {
            $webPage['about'] = ['@id' => $origin . '/#app'];
            $graph[] = $webPage;
        }

        foreach ($this->extras($page, $locale, $title, $description, $modified) as $extra) {
            $graph[] = $extra;
        }

        return ['@context' => 'https://schema.org', '@graph' => $graph];
    }

    /**
     * @return array<string, mixed>
     */
    private function organization(string $origin): array
    {
        $email = config('printopoly.contact_email');
        $logo = config('seo.logo');

        return [
            '@type' => 'Organization',
            '@id' => $origin . '/#organization',
            'name' => 'Printopoly',
            'url' => $origin,
            'logo' => [
                '@type' => 'ImageObject',
                'url' => $origin . (is_string($logo) ? $logo : '/icon-512.png'),
                'width' => 512,
                'height' => 512,
            ],
            'founder' => ['@type' => 'Person', 'name' => 'Niek Nijland'],
            'contactPoint' => [
                '@type' => 'ContactPoint',
                'contactType' => 'customer support',
                'email' => is_string($email) ? $email : '',
                'availableLanguage' => ['Dutch', 'English'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function website(string $origin): array
    {
        return [
            '@type' => 'WebSite',
            '@id' => $origin . '/#website',
            'name' => 'Printopoly',
            'url' => $origin,
            'publisher' => ['@id' => $origin . '/#organization'],
            'inLanguage' => Locale::values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function breadcrumb(PublicPage $page, Locale $locale, string $title): array
    {
        return [
            '@type' => 'BreadcrumbList',
            '@id' => $page->absoluteUrl($locale) . '#breadcrumb',
            'itemListElement' => [
                [
                    '@type' => 'ListItem',
                    'position' => 1,
                    'name' => 'Printopoly',
                    'item' => PublicPage::Home->absoluteUrl($locale),
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 2,
                    'name' => $title,
                    'item' => $page->absoluteUrl($locale),
                ],
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function extras(PublicPage $page, Locale $locale, string $title, string $description, string $modified): array
    {
        $origin = PublicPage::origin();

        return match ($page) {
            PublicPage::Home => [
                [
                    '@type' => 'WebApplication',
                    '@id' => $origin . '/#app',
                    'name' => 'Printopoly',
                    'url' => PublicPage::Home->absoluteUrl($locale),
                    'description' => $description,
                    'applicationCategory' => 'DesignApplication',
                    'operatingSystem' => 'Any',
                    'browserRequirements' => 'Requires JavaScript',
                    'isAccessibleForFree' => true,
                    'inLanguage' => Locale::values(),
                    'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'EUR'],
                    'publisher' => ['@id' => $origin . '/#organization'],
                ],
                $this->faqPage($page, $locale, $this->content->homeFaq($locale)),
            ],
            PublicPage::Faq => [$this->faqPage($page, $locale, $this->content->faq($locale))],
            PublicPage::PrintGuide => [
                [
                    '@type' => 'Article',
                    '@id' => $page->absoluteUrl($locale) . '#article',
                    'mainEntityOfPage' => ['@id' => $page->absoluteUrl($locale) . '#webpage'],
                    'headline' => $title,
                    'description' => $description,
                    'inLanguage' => $locale->value,
                    'image' => $origin . '/og/og-' . $locale->value . '.png',
                    'datePublished' => $modified,
                    'dateModified' => $modified,
                    'author' => ['@type' => 'Person', 'name' => 'Niek Nijland'],
                    'publisher' => ['@id' => $origin . '/#organization'],
                ],
            ],
            default => [],
        };
    }

    /**
     * @param list<FaqItemData> $items
     * @return array<string, mixed>
     */
    private function faqPage(PublicPage $page, Locale $locale, array $items): array
    {
        return [
            '@type' => 'FAQPage',
            '@id' => $page->absoluteUrl($locale) . '#faq',
            'inLanguage' => $locale->value,
            'mainEntity' => array_map(
                static fn (FaqItemData $item): array => [
                    '@type' => 'Question',
                    'name' => $item->question,
                    'acceptedAnswer' => ['@type' => 'Answer', 'text' => $item->answerHtml],
                ],
                $items,
            ),
        ];
    }

    /**
     * The same title and description the page puts in its head.
     *
     * @return array{0: string, 1: string}
     */
    private function titleAndDescription(PublicPage $page, Locale $locale): array
    {
        $file = match ($page) {
            PublicPage::PrintGuide => 'printgids',
            PublicPage::Faq => 'faq',
            PublicPage::Privacy => 'privacy',
            PublicPage::Terms => 'voorwaarden',
            default => null,
        };

        if ($file !== null) {
            $content = $this->content->page($file, $locale);

            return [$content->seoTitle, $content->description];
        }

        if ($page === PublicPage::Home) {
            $landing = $this->content->landing($locale);

            return [$landing['meta.title'] ?? 'Printopoly', $landing['meta.description'] ?? ''];
        }

        return [
            trans('contact.title', [], $locale->value),
            trans('contact.description', [], $locale->value),
        ];
    }

    private function modified(PublicPage $page): string
    {
        $date = config('seo.lastmod.' . $page->value);

        return is_string($date) ? $date : now()->toDateString();
    }
}
