<?php

declare(strict_types=1);

namespace App\Enums;

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
     * The first supported language in the browser's Accept-Language list.
     *
     * @param array<string> $languages
     */
    public static function fromPreferredLanguages(array $languages): ?self
    {
        foreach ($languages as $language) {
            $primarySubtag = explode('_', str_replace('-', '_', $language))[0];
            $match = self::tryFrom(strtolower($primarySubtag));

            if ($match instanceof self) {
                return $match;
            }
        }

        return null;
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

    public function label(): string
    {
        return match ($this) {
            self::Dutch => 'Nederlands',
            self::English => 'English',
        };
    }
}
