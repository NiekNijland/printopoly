<?php

declare(strict_types=1);

namespace Tests\Unit\Enums;

use App\Enums\Locale;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class LocaleTest extends TestCase
{
    /**
     * @return iterable<string, array{list<string>, Locale|null}>
     */
    public static function preferredLanguages(): iterable
    {
        yield 'Dutch from Belgium' => [['nl_BE', 'en'], Locale::Dutch];
        yield 'English first, Dutch listed too' => [['en_GB', 'nl'], Locale::Dutch];
        yield 'English only' => [['en_GB', 'en'], Locale::English];
        yield 'English and German' => [['en_US', 'de'], Locale::English];
        yield 'Dutch from the Netherlands' => [['nl_NL', 'nl', 'en'], Locale::Dutch];
        yield 'hyphenated tag' => [['en-US'], Locale::English];
        yield 'unsupported, then Dutch' => [['de_DE', 'nl'], Locale::Dutch];
        yield 'nothing supported' => [['de', 'fr'], null];
        yield 'empty header' => [[], null];
    }

    /**
     * @param list<string> $languages
     */
    #[DataProvider('preferredLanguages')]
    public function test_it_defaults_to_dutch_unless_the_browser_only_asks_for_english(array $languages, ?Locale $expected): void
    {
        self::assertSame($expected, Locale::fromPreferredLanguages($languages));
    }

    public function test_dutch_is_the_default_and_both_languages_exist(): void
    {
        self::assertSame(Locale::Dutch, Locale::default());
        self::assertSame(['nl', 'en'], Locale::values());
        self::assertSame('Nederlands', Locale::Dutch->label());
        self::assertSame('English', Locale::English->label());
    }
}
