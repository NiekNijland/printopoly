<?php

declare(strict_types=1);

namespace App\Modules\Content\Data;

use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What the head of a public page needs besides its own title and
 * description: canonical, hreflang alternates and the Open Graph basics (B66).
 */
#[TypeScript]
final class SeoData extends Data
{
    /**
     * @param array<string, string> $alternates hreflang to absolute URL, including x-default
     * @param list<string> $alternateLocales Open Graph locales of the other languages
     * @param array<string, mixed> $jsonLd the page's structured data, one schema.org @graph
     */
    public function __construct(
        public readonly string $canonical,
        #[LiteralTypeScriptType('Record<string, string>')]
        public readonly array $alternates,
        public readonly string $ogImage,
        public readonly string $ogLocale,
        #[LiteralTypeScriptType('string[]')]
        public readonly array $alternateLocales,
        public readonly int $ogImageWidth,
        public readonly int $ogImageHeight,
        #[LiteralTypeScriptType('Record<string, unknown>')]
        public readonly array $jsonLd,
    ) {
    }

    /**
     * @param array<string, mixed> $jsonLd
     */
    public static function forPage(PublicPage $page, Locale $locale, array $jsonLd = []): self
    {
        $alternates = [];

        foreach (Locale::cases() as $case) {
            $alternates[$case->value] = $page->absoluteUrl($case);
        }

        $alternates['x-default'] = $page->absoluteUrl(Locale::default());

        return new self(
            canonical: $page->absoluteUrl($locale),
            alternates: $alternates,
            ogImage: PublicPage::origin() . '/og/og-' . $locale->value . '.png',
            ogLocale: $locale->openGraphLocale(),
            alternateLocales: array_values(array_map(
                static fn (Locale $other): string => $other->openGraphLocale(),
                array_filter(Locale::cases(), static fn (Locale $other): bool => $other !== $locale),
            )),
            ogImageWidth: self::dimension('width'),
            ogImageHeight: self::dimension('height'),
            jsonLd: $jsonLd,
        );
    }

    private static function dimension(string $side): int
    {
        $value = config('seo.og_image.' . $side);

        return is_int($value) ? $value : 0;
    }
}
