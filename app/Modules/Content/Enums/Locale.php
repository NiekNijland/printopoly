<?php

declare(strict_types=1);

namespace App\Modules\Content\Enums;

/**
 * The interface languages. Every public page lives under /{locale} (B37, B46).
 */
enum Locale: string
{
    case Dutch = 'nl';
    case English = 'en';

    public static function default(): self
    {
        return self::Dutch;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $locale): string => $locale->value, self::cases());
    }

    /**
     * The language to answer a browser in, from its Accept-Language list (already ordered by q-value).
     * Dutch is the default of this site: English wins only when the browser asks for English and does not
     * list Dutch at all, so "en-US,en;q=0.9,nl;q=0.8" and "nl-NL,nl;q=0.9,en;q=0.8" both give Dutch (ronde 2).
     * Null when neither is asked for.
     *
     * @param array<string> $languages
     */
    public static function fromPreferredLanguages(array $languages): ?self
    {
        $found = [];

        foreach ($languages as $language) {
            $primarySubtag = explode('_', str_replace('-', '_', $language))[0];
            $match = self::tryFrom(strtolower($primarySubtag));

            if ($match instanceof self) {
                $found[$match->value] = $match;
            }
        }

        return $found[self::Dutch->value] ?? $found[self::English->value] ?? null;
    }

    /**
     * The locale in Open Graph's language_TERRITORY form.
     */
    public function openGraphLocale(): string
    {
        return match ($this) {
            self::Dutch => 'nl_NL',
            self::English => 'en_GB',
        };
    }
}
