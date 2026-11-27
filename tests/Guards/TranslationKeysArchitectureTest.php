<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\TranslationKeysGuard;
use Tests\Support\RecursiveFiles;

final class TranslationKeysArchitectureTest extends TestCase
{
    private const array FRAMEWORK_MAIL_LAYOUTS = [
        'vendor/laravel/framework/src/Illuminate/Mail/resources/views/html/message.blade.php',
        'vendor/laravel/framework/src/Illuminate/Mail/resources/views/text/message.blade.php',
    ];

    private const array CATALOGS = [
        'en' => ['a.title' => 'Title', 'a.count' => ':count edition|:count editions', 'b.status_ready' => 'Ready', 'c.blank_tagline' => 'Blank'],
        'nl' => ['a.title' => 'Titel', 'a.count' => ':count editie|:count edities', 'b.status_ready' => 'Klaar', 'c.blank_tagline' => 'Leeg'],
    ];

    private const string SOURCE = "t('a.title'); tChoice('a.count', 2); t(`b.status_\${state}`); const label = 'c.blank'; t(`\${label}_tagline`);";

    /**
     * @return iterable<string, array{array<string, array<string, string>>, array<string, string>, list<string>, string}>
     */
    public static function brokenTranslations(): iterable
    {
        $catalogs = self::CATALOGS;
        $source = ['resources/js/a.tsx' => self::SOURCE];

        $missing = $catalogs;
        unset($missing['nl']['a.title']);

        yield 'a key missing in one language' => [$missing, $source, [], 'the key a.title is missing in lang/nl.json'];

        $placeholder = $catalogs;
        $placeholder['nl']['a.count'] = ':aantal editie|:aantal edities';

        yield 'another placeholder in one language' => [$placeholder, $source, [], 'the key a.count has other placeholders'];

        $plural = $catalogs;
        $plural['nl']['a.count'] = ':count edities';

        yield 'another number of plural forms' => [$plural, $source, [], 'the key a.count has another number of plural forms'];

        yield 'an undefined key through t()' => [$catalogs, ['resources/js/b.tsx' => self::SOURCE . " t('a.missing');"], [], 'resources/js/b.tsx translates the key a.missing'];
        yield 'an undefined key through tChoice()' => [$catalogs, ['resources/js/b.tsx' => self::SOURCE . ' tChoice("a.gone", 1);'], [], 'translates the key a.gone'];
        yield 'an undefined key through __()' => [$catalogs, ['app/X.php' => self::SOURCE . " __('auth.gone');"], [], 'app/X.php translates the key auth.gone'];
        yield 'an undefined key through trans_choice()' => [$catalogs, ['app/X.php' => self::SOURCE . " trans_choice('auth.gone', 2);"], [], 'translates the key auth.gone'];
        yield 'an undefined key through @lang' => [$catalogs, ['resources/views/x.blade.php' => self::SOURCE . " @lang('auth.gone')"], [], 'translates the key auth.gone'];
        yield 'an undefined key through Lang::get()' => [$catalogs, ['app/X.php' => self::SOURCE . " Lang::get('auth.gone');"], [], 'translates the key auth.gone'];
        yield 'an unused key' => [$catalogs, ['resources/js/a.tsx' => "t('a.title'); tChoice('a.count', 2); t(`b.status_\${state}`);"], [], 'the key c.blank_tagline is used by no source'];
        yield 'a listed key that a source uses again' => [$catalogs, $source, ['a.title'], 'the key a.title is on the counted list of unused keys'];
        yield 'a listed key that no catalog holds' => [$catalogs, $source, ['a.deleted'], 'the key a.deleted is on the counted list of unused keys'];
    }

    /**
     * @param array<string, array<string, string>> $catalogs
     * @param array<string, string> $sources
     * @param list<string> $unusedList
     */
    #[DataProvider('brokenTranslations')]
    public function test_it_detects_a_translation_that_breaks_the_rules(array $catalogs, array $sources, array $unusedList, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", new TranslationKeysGuard($catalogs, $sources, $unusedList)->violations()));
    }

        public function test_it_accepts_keys_named_whole_or_built_from_a_template_and_a_listed_unused_key(): void
        {
        $method = ['app/X.php' => "\$this->t('x'); \$i18n.t('y'); __('a.title'); trans_choice('a.count', 2); __(\"b.status_{\$state}\"); const label = 'c.blank'; t(`\${label}_tagline`);"];
        $catalogs = self::CATALOGS;
        $catalogs['en']['d.unused'] = 'Unused';
        $catalogs['nl']['d.unused'] = 'Ongebruikt';

        self::assertSame([], new TranslationKeysGuard(self::CATALOGS, ['resources/js/a.tsx' => self::SOURCE], [])->violations());
        self::assertSame([], new TranslationKeysGuard(self::CATALOGS, $method, [])->violations());
        self::assertSame([], new TranslationKeysGuard($catalogs, ['resources/js/a.tsx' => self::SOURCE], ['d.unused'])->violations());
    }

        public function test_it_keeps_the_catalogs_and_the_sources_of_the_real_tree_in_step(): void
        {
        $catalogs = [];

        foreach (['en', 'nl'] as $language) {
            $catalog = json_decode((string) file_get_contents($this->root() . '/lang/' . $language . '.json'), true, flags: JSON_THROW_ON_ERROR);
            self::assertIsArray($catalog);
            $catalogs[$language] = [];

            foreach ($catalog as $key => $text) {
                if (is_string($text)) {
                    $catalogs[$language][(string) $key] = $text;
                }
            }
        }

        $sources = [];

        foreach (['app', 'config', 'routes', 'resources/views', 'resources/js'] as $folder) {
            foreach (RecursiveFiles::in($this->root() . '/' . $folder) as $file) {
                $path = mb_substr($file->getPathname(), mb_strlen($this->root()) + 1);

                if (preg_match('/\.(php|ts|tsx)$/', $path) === 1 && preg_match('/\.test\.tsx?$|^resources\/js\/(actions|routes|wayfinder)\//', $path) !== 1) {
                    $sources[$path] = (string) file_get_contents($file->getPathname());
                }
            }
        }

        foreach (self::FRAMEWORK_MAIL_LAYOUTS as $path) {
            $sources[$path] = (string) file_get_contents($this->root() . '/' . $path);
        }

        self::assertSame([], new TranslationKeysGuard($catalogs, $sources, [])->violations());
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
