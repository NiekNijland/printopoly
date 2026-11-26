<?php

declare(strict_types=1);

namespace App\Modules\Content\Enums;

/**
 * The public pages that search engines index, each with a slug per language
 * (B66). The slug table is the single source for routes, hreflang, the
 * language switch and the sitemap.
 */
enum PublicPage: string
{
    case Home = 'home';
    case PrintGuide = 'print-guide';
    case Faq = 'faq';
    case Privacy = 'privacy';
    case Terms = 'terms';
    case Contact = 'contact';

    /**
     * Pages that get their own route; the home page is registered on its own.
     *
     * @return list<self>
     */
    public static function withSlug(): array
    {
        return array_values(array_filter(
            self::cases(),
            static fn (self $page): bool => $page !== self::Home,
        ));
    }

    public static function origin(): string
    {
        return rtrim(is_string(config('app.url')) ? config('app.url') : '', '/');
    }

    public function slug(Locale $locale): string
    {
        return match ($this) {
            self::Home => '',
            self::PrintGuide => $locale === Locale::Dutch ? 'printgids' : 'print-guide',
            self::Faq => $locale === Locale::Dutch ? 'vragen' : 'faq',
            self::Privacy => 'privacy',
            self::Terms => $locale === Locale::Dutch ? 'voorwaarden' : 'terms',
            self::Contact => 'contact',
        };
    }

    /**
     * The path without a host, such as /nl/printgids.
     */
    public function path(Locale $locale): string
    {
        $slug = $this->slug($locale);

        return $slug === '' ? '/' . $locale->value : '/' . $locale->value . '/' . $slug;
    }

    /**
     * The absolute URL on the public domain (APP_URL), for canonical,
     * hreflang and the sitemap.
     */
    public function absoluteUrl(Locale $locale): string
    {
        return self::origin() . $this->path($locale);
    }
}
