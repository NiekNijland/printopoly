<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\Locale;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class LocaleTest extends TestCase
{
    /**
     * @return iterable<string, array{list<string>, Locale|null}>
     */
    public static function preferredLanguages(): iterable
    {
        yield 'Dutch from Belgium' => [['nl_BE', 'en'], Locale::Dutch];
        yield 'English first' => [['en_GB', 'nl'], Locale::English];
        yield 'hyphenated tag' => [['en-US'], Locale::English];
        yield 'unsupported, then Dutch' => [['de_DE', 'nl'], Locale::Dutch];
        yield 'nothing supported' => [['de', 'fr'], null];
        yield 'empty header' => [[], null];
    }

    /**
     * @param list<string> $languages
     */
    #[Test]
    #[DataProvider('preferredLanguages')]
    public function it_picks_the_first_supported_browser_language(array $languages, ?Locale $expected): void
    {
        self::assertSame($expected, Locale::fromPreferredLanguages($languages));
    }

    #[Test]
    public function dutch_is_the_default_and_both_languages_exist(): void
    {
        self::assertSame(Locale::Dutch, Locale::default());
        self::assertSame(['nl', 'en'], Locale::values());
        self::assertSame('Nederlands', Locale::Dutch->label());
        self::assertSame('English', Locale::English->label());
    }
}
