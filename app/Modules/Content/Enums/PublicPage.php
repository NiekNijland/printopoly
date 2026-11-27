<?php

declare(strict_types=1);

namespace App\Modules\Content\Enums;

use Illuminate\Support\Facades\Config;

/**
 * The public pages that search engines index, each with a slug per language
 * (B66). The slug table is the single source for routes, hreflang, the
 * language switch and the sitemap.
 */
enum PublicPage: string
{
    case HOME = 'home';
    case PRINT_GUIDE = 'print-guide';
    case FAQ = 'faq';
    case PRIVACY = 'privacy';
    case TERMS = 'terms';
    case CONTACT = 'contact';

    /**
     * Pages that get their own route; the home page is registered on its own.
     *
     * @return list<self>
     */
    public static function withSlug(): array
    {
        return array_values(array_filter(
            self::cases(),
            static fn (self $page): bool => $page !== self::HOME,
        ));
    }

    public static function origin(): string
    {
        return rtrim(Config::string('app.url', ''), '/');
    }

    public function slug(Locale $locale): string
    {
        return match ($this) {
            self::HOME => '',
            self::PRINT_GUIDE => $locale === Locale::DUTCH ? 'printgids' : 'print-guide',
            self::FAQ => $locale === Locale::DUTCH ? 'vragen' : 'faq',
            self::PRIVACY => 'privacy',
            self::TERMS => $locale === Locale::DUTCH ? 'voorwaarden' : 'terms',
            self::CONTACT => 'contact',
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
