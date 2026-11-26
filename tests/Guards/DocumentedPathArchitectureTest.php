<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\DocumentedPathGuard;
use Tests\Support\SourceSandbox;

final class DocumentedPathArchitectureTest extends TestCase
{
    private const array ROOTS = ['.github', 'app', 'baselines', 'bootstrap', 'config', 'database', 'docs', 'lang', 'lists', 'resources', 'routes', 'scripts', 'tests'];

    private const array GUIDES = ['AGENTS.md', 'docs/review-rubric.md', 'docs/decisions/0001-one-pattern.md'];

    /**
     * @return iterable<string, array{array<string, string>, string}>
     */
    public static function guidesThatNameAPathThatIsGone(): iterable
    {
        yield 'a file from the repository root' => [['AGENTS.md' => "# Gids\n\nKopieer `app/Support/Like.php`, niet `app/Support/Search.php`.\n", 'app/Support/Like.php' => "<?php\n"], 'AGENTS.md:3: `app/Support/Search.php` does not exist'];
        yield 'a folder in a nested guide' => [['tests/AGENTS.md' => "| Helpers | `tests/Support/Feature/` | `tests/Support/Browser/` |\n", 'tests/Support/Feature/Helpers.php' => "<?php\n"], 'tests/AGENTS.md:1: `tests/Support/Browser/` does not exist'];
        yield 'a relative file in a frontend guide' => [['resources/js/AGENTS.md' => "Gebruik `hooks/use-online.ts` of\n`hooks/use-offline.ts`.\n", 'resources/js/hooks/use-online.ts' => ''], 'resources/js/AGENTS.md:2: no file ends in `hooks/use-offline.ts`'];
        yield 'the review rubric' => [['docs/review-rubric.md' => "De lijst is `scripts/ci-ratchets.sh` (zie `tests/Guards/GoneTest.php`).\n", 'scripts/ci-ratchets.sh' => ''], 'docs/review-rubric.md:1: `tests/Guards/GoneTest.php` does not exist'];
        yield 'an HTML code element' => [['AGENTS.md' => "Kopieer <code>app/Gone.php</code>.\n"], 'AGENTS.md:1: `app/Gone.php` does not exist'];
        yield 'a link target' => [['AGENTS.md' => "Zie [de layout](docs/guards/gone.md).\n"], 'AGENTS.md:1: `docs/guards/gone.md` does not exist'];
        yield 'a path with a line number' => [['AGENTS.md' => "Zie `app/Gone.php:12`.\n"], 'AGENTS.md:1: `app/Gone.php` does not exist'];
        yield 'a path under a dot folder' => [['AGENTS.md' => "Zie `.github/gone.md`.\n"], 'AGENTS.md:1: `.github/gone.md` does not exist'];
        yield 'a path in a fenced block' => [['AGENTS.md' => "```bash\ncat app/Gone.php\n```\n\n```\n`app/Gone.php`\n```\n"], 'AGENTS.md:6: `app/Gone.php` does not exist'];
        yield 'the decision record' => [['docs/decisions/0001-one-pattern.md' => "De tabellen staan in `docs/guards/gone.md`.\n"], 'docs/decisions/0001-one-pattern.md:1: `docs/guards/gone.md` does not exist'];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('guidesThatNameAPathThatIsGone')]
    public function test_it_fails_a_guide_that_names_a_path_that_does_not_exist(array $files, string $reason): void
    {
        $violations = $this->violationsOf($files);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
        self::assertStringContainsString('placeholder such as <Name>', $violations[0]);
    }

    public function test_it_accepts_paths_that_exist_placeholders_wildcards_and_text_that_is_no_path(): void
    {
        $files = [
            'AGENTS.md' => implode("\n", [
                'Kopieer `app/Support/Like.php` in `app/Support` of `app/Support/`; de hook `hooks/use-debounce.ts`, de link [layout](docs/guards/layout.md).',
                'Een module is `app/Modules/<Domain>/Actions`, een plan `docs/plans/example-*.md`, mappen `app/Http/Controllers/{Admin,Boxes}`.',
                "Draai `composer pint`, lees `vendor/package/README.md`, schrijf `storage/app/x.json`, roep `Inertia::render()` en `Route::get('/a/b')` aan.",
                'Waarden als `and/or`, `text/plain`, `resources/js/...`, `phpstan.neon`, [de site](https://printopoly.nl/a/b) en [terug](../AGENTS.md).',
                '```', '`app/InAFence.php` staat in een blok en telt toch: zie het pad hierboven.', '```',
            ]),
            'app/Support/Like.php' => "<?php\n",
            'app/InAFence.php' => "<?php\n",
            'docs/guards/layout.md' => '',
            'resources/js/hooks/use-debounce.ts' => '',
            'vendor/package/composer.json' => '{}',
            'storage/app/.gitignore' => '',
            'README.md' => 'Geen gids: `app/Gone.php`.',
            'docs/notes.md' => 'Geen gids: `app/Gone.php`.',
        ];

        self::assertSame([], $this->violationsOf($files));
    }

    public function test_it_names_the_guide_relative_to_the_root_when_the_checkout_sits_under_a_dot_directory(): void
    {
        $violations = $this->violationsOf(['AGENTS.md' => "Kopieer `app/Support/Gone.php`.\n", 'app/Support/Like.php' => "<?php\n"], '.checkout-');

        self::assertCount(1, $violations);
        self::assertStringStartsWith('AGENTS.md:1: `app/Support/Gone.php` does not exist', $violations[0]);
    }

    public function test_it_finds_only_paths_that_exist_in_every_guide(): void
    {
        $guard = new DocumentedPathGuard(dirname(__DIR__, 2), self::ROOTS, [...self::GUIDES, ...$this->rowsFiles()], 'AGENTS.md');

        self::assertNotSame([], $guard->pathsInGuide('AGENTS.md'));
        self::assertSame([], $guard->violations());
    }

    /**
     * @param array<string, string> $files
     * @return list<string>
     */
    private function violationsOf(array $files, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create($files, $prefix);

        try {
            return new DocumentedPathGuard($root, self::ROOTS, self::GUIDES, 'AGENTS.md')->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }

    /**
     * @return list<string> the rows files of the guards, which are guides too
     */
    private function rowsFiles(): array
    {
        $root = dirname(__DIR__, 2);

        $files = glob($root . '/docs/guards/*.md');

        return array_map(static fn (string $file): string => substr($file, strlen($root) + 1), $files === false ? [] : $files);
    }
}
