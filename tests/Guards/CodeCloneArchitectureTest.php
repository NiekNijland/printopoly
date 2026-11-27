<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CodeCloneGuard;
use Tests\Support\SourceSandbox;

final class CodeCloneArchitectureTest extends TestCase
{
    private const string LIST = 'tests/Guards/lists/code-clones.txt';

    private const array FOLDERS = ['app', 'resources/js'];

    private const array EXTENSIONS = ['php', 'ts', 'tsx'];

    private const array SKIP = ['~\.test\.tsx?$~', '~^resources/js/(testing|actions|routes|wayfinder)/~'];

    /**
     * @return iterable<string, array{array<string, string>, string}>
     */
    public static function repeatedCode(): iterable
    {
        yield 'eight lines in two components' => [['resources/js/a.tsx' => self::body(8), 'resources/js/b.tsx' => self::body(8)], 'resources/js/a.tsx:1-8, resources/js/b.tsx:1-8'];
        yield 'eight lines in two classes' => [['app/A.php' => "<?php\n" . self::body(8), 'app/B.php' => "<?php\n" . self::body(8)], 'app/A.php:2-9, app/B.php:2-9'];
        yield 'a component and a class' => [['resources/js/a.ts' => self::body(9), 'app/B.php' => self::body(9)], 'app/B.php:1-9, resources/js/a.ts:1-9'];
        yield 'the same lines with other indentation and spacing' => [['resources/js/a.tsx' => self::body(8), 'resources/js/b.tsx' => (string) preg_replace('/^/m', '        ', str_replace(' = ', '   =   ', self::body(8)))], 'move them into one function or component'];
        yield 'the same lines with braces, blank lines and comments between' => [['resources/js/a.tsx' => self::body(8), 'resources/js/b.tsx' => str_replace("\n", "\n}\n\n// note\n", self::body(8))], 'resources/js/b.tsx:1-29'];
        yield 'the same lines with other imports above' => [['resources/js/a.tsx' => "import a from 'a';\n" . self::body(8), 'resources/js/b.tsx' => "import b from 'b';\nimport c from 'c';\n" . self::body(8)], 'resources/js/a.tsx:2-9, resources/js/b.tsx:3-10'];
        yield 'a repeat inside a longer file' => [['resources/js/a.tsx' => "const head = 1;\n" . self::body(12) . "const tail = 2;\n", 'resources/js/b.tsx' => self::body(12)], 'resources/js/a.tsx:2-13'];
        yield 'three files' => [['resources/js/a.tsx' => self::body(8), 'resources/js/b.tsx' => self::body(8), 'resources/js/c/d.tsx' => self::body(8)], 'resources/js/c/d.tsx:1-8'];
        yield 'two repeats in one file with a third file' => [['resources/js/a.tsx' => self::body(8) . "const gap = 0;\n" . self::body(8), 'resources/js/b.tsx' => self::body(8)], 'resources/js/a.tsx:1-17'];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('repeatedCode')]
    public function test_it_detects_eight_or_more_lines_repeated_across_files(array $files, string $words): void
    {
        [$findings, $explained] = $this->scan($files);

        self::assertCount(1, $findings);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function codeThatIsNotACopy(): iterable
    {
        yield 'seven lines' => [['resources/js/a.tsx' => self::body(7), 'resources/js/b.tsx' => self::body(7)]];
        yield 'eight lines with one line changed' => [['resources/js/a.tsx' => self::body(8), 'resources/js/b.tsx' => str_replace('line4 = 4', 'line4 = 5', self::body(8))]];
        yield 'a repeat inside one file' => [['resources/js/a.tsx' => self::body(8) . "const gap = 0;\n" . self::body(8)]];
        yield 'eight equal imports' => [['resources/js/a.tsx' => self::imports(), 'resources/js/b.tsx' => self::imports()]];
        yield 'eight equal comment lines' => [['app/A.php' => str_repeat("// the same words\n", 8), 'app/B.php' => str_repeat("// the same words\n", 8)]];
        yield 'braces only' => [['resources/js/a.tsx' => str_repeat("});\n", 20), 'resources/js/b.tsx' => str_repeat("});\n", 20)]];
        yield 'a test file and its component' => [['resources/js/a.tsx' => self::body(8), 'resources/js/a.test.tsx' => self::body(8)]];
        yield 'a test helper' => [['resources/js/a.tsx' => self::body(8), 'resources/js/testing/a.ts' => self::body(8)]];
        yield 'generated routes and actions' => [['resources/js/routes/a/index.ts' => self::body(8), 'resources/js/actions/A/B.ts' => self::body(8), 'resources/js/wayfinder/index.ts' => self::body(8)]];
        yield 'another extension' => [['resources/js/a.tsx' => self::body(8), 'resources/js/a.css' => self::body(8)]];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('codeThatIsNotACopy')]
    public function test_it_accepts_short_changed_and_trivial_repeats_and_tests(array $files): void
    {
        self::assertSame([], $this->scan($files)[0]);
    }

    public function test_it_fails_a_listed_group_that_is_gone_and_names_a_new_one_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([self::LIST => "000000000000 resources/js/x.tsx resources/js/y.tsx\n", 'app/A.php' => self::body(8), 'resources/js/b.tsx' => self::body(8)], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(2, $violations);
        self::assertStringContainsString(' app/A.php resources/js/b.tsx', $violations[0]);
        self::assertStringContainsString('never added to the counted list', $violations[0]);
        self::assertStringContainsString('no longer found', $violations[1]);
    }

    public function test_it_keeps_the_repeated_code_of_the_tree_to_its_counted_list(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function scan(array $files): array
    {
        $root = SourceSandbox::create(['app/.keep' => '', 'resources/js/.keep' => '', ...$files], '.checkout-');

        try {
            $guard = $this->guard($root);
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private function guard(string $root): CodeCloneGuard
    {
        return new CodeCloneGuard($root, self::FOLDERS, self::EXTENSIONS, self::SKIP, self::LIST);
    }

    private static function body(int $lines): string
    {
        $body = '';

        for ($line = 1; $line <= $lines; $line++) {
            $body .= 'const line' . $line . ' = ' . $line . ";\n";
        }

        return $body;
    }

    private static function imports(): string
    {
        $imports = '';

        for ($line = 1; $line <= 8; $line++) {
            $imports .= "import { part{$line} } from './part{$line}';\n";
        }

        return $imports;
    }
}
