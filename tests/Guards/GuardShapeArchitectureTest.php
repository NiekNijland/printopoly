<?php

declare(strict_types=1);

namespace Tests\Guards;

use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\DeclarationInspector;
use Tests\Support\Architecture\GuardShapeGuard;
use Tests\Support\SourceSandbox;

final class GuardShapeArchitectureTest extends TestCase
{
    private const string DETECTOR = 'tests/Support/Architecture/FooGuard.php';

    private const string TEST = 'tests/Guards/FooArchitectureTest.php';

    private const string FAILING = <<<'PHP'
            public static function cases(): iterable
            {
                yield 'a case' => ['a'];
            }

            #[DataProvider('cases')]
            public function test_it_fails(string $a): void
            {
                self::assertStringContainsString('the rule', implode("\n", new FooGuard($a)->violations()));
            }

        PHP;

    private const string PASSING = <<<'PHP'
            public function test_it_passes(): void
            {
                self::assertSame([], new FooGuard(sys_get_temp_dir())->violations());
            }

        PHP;

    private const string REAL_TREE = <<<'PHP'
            public function test_it_holds_the_tree(): void
            {
                self::assertSame([], new FooGuard(dirname(__DIR__, 2))->violations());
            }

        PHP;

    /**
     * @return iterable<string, array{array<string, string>, string}>
     */
    public static function guardsThatBreakTheShape(): iterable
    {
        yield 'a detector with the path of a folder' => [[self::DETECTOR => self::detector("return 'app/Models';")], 'FooGuard.php literal-path app/Models'];
        yield 'a detector with a folder under a leading slash' => [[self::DETECTOR => self::detector("return '/app';")], 'literal-path /app'];
        yield 'a detector with the name of a file' => [[self::DETECTOR => self::detector("return 'composer.json';")], 'literal-path composer.json'];
        yield 'a detector with a path in a concatenation' => [[self::DETECTOR => self::detector("return \$this->root . '/app/Models/Note.php';")], 'literal-path /app/Models/Note.php'];
        yield 'a detector with a path in an interpolated string' => [[self::DETECTOR => self::detector('return "{$this->root}/composer.json";')], 'literal-path /composer.json'];
        yield 'a reader with a path' => [['tests/Support/Architecture/FooReader.php' => self::detector("return 'app/Models';", 'FooReader')], 'FooReader.php literal-path app/Models'];
        yield 'a detector that no test names' => [[self::TEST => "<?php\n\nnamespace Tests\\Guards;\n\nfinal class FooArchitectureTest {}\n"], 'FooGuard.php untested FooGuard'];
        yield 'a detector whose name ends in Helpers' => [['tests/Support/Architecture/FooHelpers.php' => self::detector(name: 'FooHelpers')], 'helper-name FooHelpers'];
        yield 'a detector whose name ends in Scenario' => [['tests/Support/Architecture/FooScenario.php' => self::detector(name: 'FooScenario')], 'helper-name FooScenario'];
        yield 'a test without failing examples' => [[self::TEST => self::test(self::PASSING . self::REAL_TREE)], self::TEST . ' no-failing'];
        yield 'a test without passing examples' => [[self::TEST => self::test(self::FAILING . self::REAL_TREE)], self::TEST . ' no-passing'];
        yield 'a test without a real-tree case' => [[self::TEST => self::test(self::FAILING . self::PASSING)], self::TEST . ' no-real-tree'];
        yield 'a real-tree case with a data provider' => [[self::TEST => self::test(self::FAILING . self::PASSING . str_replace('public function test_it_holds_the_tree(): void', "#[DataProvider('cases')]\n    public function test_it_holds_the_tree(string \$a): void", self::REAL_TREE))], self::TEST . ' no-real-tree'];
        yield 'a passing example inside the real-tree case' => [[self::TEST => self::test(self::FAILING . str_replace('self::assertSame([], new FooGuard(dirname(__DIR__, 2))->violations());', "self::assertSame([], new FooGuard(dirname(__DIR__, 2))->violations());\n        self::assertSame([], new FooGuard(sys_get_temp_dir())->violations());", self::REAL_TREE))], self::TEST . ' no-passing'];
        yield 'a real-tree case that asserts a non-empty result' => [[self::TEST => self::test(self::FAILING . self::PASSING . str_replace('assertSame([]', "assertSame(['x']", self::REAL_TREE))], self::TEST . ' no-real-tree'];
        yield 'a test method that is not public' => [[self::TEST => self::test(self::FAILING . self::PASSING . str_replace('public function test_it_holds', 'private function test_it_holds', self::REAL_TREE))], self::TEST . ' no-real-tree'];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('guardsThatBreakTheShape')]
    public function test_it_fails_a_guard_that_breaks_the_shape_and_names_the_fix(array $files, string $finding): void
    {
        [$findings, $explained] = $this->findingsOf($files);

        self::assertStringContainsString($finding, implode("\n", $findings));
        self::assertNotSame([], $explained);
    }

    public function test_it_names_the_directory_scan_and_the_three_parts_in_its_messages(): void
    {
        $guard = new GuardShapeGuard(new DeclarationInspector(), sys_get_temp_dir(), 'x', []);
        $explained = implode("\n", $guard->explain(['a.php literal-path app', 'a.php untested FooGuard', 'b.php no-real-tree']));

        self::assertStringContainsString('reflection or a directory scan', $explained);
        self::assertStringContainsString('failing examples', $explained);
        self::assertStringContainsString('passing examples', $explained);
        self::assertStringContainsString('one case over the real tree', $explained);
        self::assertStringContainsString('dirname(__DIR__, n)', $explained);
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function guardsThatKeepTheShape(): iterable
    {
        yield 'a whole guard with its test' => [[]];
        yield 'a bare word that is also a folder' => [[self::DETECTOR => self::detector("return ['app', 'tests'];")]];
        yield 'a pattern that holds a folder name' => [[self::DETECTOR => self::detector("return '/^app\\\\//';")]];
        yield 'a relative prefix' => [[self::DETECTOR => self::detector("return str_starts_with(\$this->root, './') || str_starts_with(\$this->root, '../');")]];
        yield 'a path that no file has' => [[self::DETECTOR => self::detector("return 'app/Missing/Thing.php';")]];
        yield 'a sentence that names a folder' => [[self::DETECTOR => self::detector("return 'put it in app/Models please';")]];
        yield 'a glob' => [[self::DETECTOR => self::detector("return 'app/*.php';")]];
        yield 'a placeholder' => [[self::DETECTOR => self::detector("return 'app/<Name>';")]];
        yield 'a class name' => [[self::DETECTOR => self::detector("return 'App\\\\Models\\\\Note';")]];
        yield 'a reader class that is no guard and no test names' => [['tests/Support/Architecture/FooReader.php' => self::detector(name: 'FooReader')]];
        yield 'a test that names no guard' => [['tests/Guards/OtherTest.php' => "<?php\n\nnamespace Tests\\Guards;\n\nfinal class OtherTest {}\n"]];
        yield 'a guard imported under an alias' => [[self::TEST => str_replace('use Tests\\Support\\Architecture\\FooGuard;', 'use Tests\\Support\\Architecture\\FooGuard as Foo;', str_replace('new FooGuard(', 'new Foo(', self::test()))]];
        yield 'tests spelled with the attribute Test' => [[self::TEST => str_replace(['public function test_it_', 'use PHPUnit\\Framework\\TestCase;'], ["#[Test]\n    public function it_", "use PHPUnit\\Framework\\Attributes\\Test;\nuse PHPUnit\\Framework\\TestCase;"], self::test())]];
        yield 'a real-tree case through a private helper' => [[self::TEST => self::test(self::FAILING . self::PASSING . str_replace('dirname(__DIR__, 2)', '$this->root()', self::REAL_TREE) . "    private function root(): string\n    {\n        return dirname(__DIR__, 2);\n    }\n")]];
        yield 'a real-tree case that calls findings' => [[self::TEST => self::test(self::FAILING . self::PASSING . str_replace('->violations()', '->findings()', self::REAL_TREE))]];
        yield 'a passing example with assertEmpty' => [[self::TEST => self::test(self::FAILING . str_replace('self::assertSame([], ', 'self::assertEmpty(', self::PASSING) . self::REAL_TREE)]];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('guardsThatKeepTheShape')]
    public function test_it_accepts_a_detector_with_its_test_and_the_near_misses_of_a_path(array $files): void
    {
        self::assertSame([], $this->findingsOf($files)[0]);
    }

    public function test_it_names_the_files_relative_to_a_root_under_a_dot_directory(): void
    {
        self::assertSame(['tests/Support/Architecture/FooGuard.php literal-path app/Models'], $this->findingsOf([self::DETECTOR => self::detector("return 'app/Models';")], '.checkout-')[0]);
    }

    public function test_it_fails_on_a_guard_folder_that_does_not_exist(): void
    {
        $root = SourceSandbox::create(['app/Models/Note.php' => "<?php\n"]);

        try {
            $this->expectException(InvalidArgumentException::class);
            new GuardShapeGuard(new DeclarationInspector(), $root, 'tests/Support/Architecture', ['tests/Guards'])->findings();
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_it_holds_every_guard_of_the_guard_folder_to_the_shape(): void
    {
        $root = dirname(__DIR__, 2);
        $guard = new GuardShapeGuard(new DeclarationInspector(), $root, 'tests/Support/Architecture', ['tests/Guards']);

        self::assertSame([], $guard->explain($guard->findings()));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function findingsOf(array $files, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create([self::DETECTOR => self::detector(), self::TEST => self::test(), 'app/Models/Note.php' => "<?php\n", 'composer.json' => '{}', ...$files], $prefix);

        try {
            $guard = new GuardShapeGuard(new DeclarationInspector(), $root, 'tests/Support/Architecture', ['tests/Guards']);
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private static function detector(string $body = 'return [];', string $name = 'FooGuard'): string
    {
        return "<?php\n\nnamespace Tests\\Support\\Architecture;\n\nfinal readonly class {$name}\n{\n    public function __construct(private string \$root)\n    {\n    }\n\n    public function violations(): mixed\n    {\n        {$body}\n    }\n}\n";
    }

    private static function test(?string $body = null): string
    {
        return "<?php\n\nnamespace Tests\\Guards;\n\nuse PHPUnit\\Framework\\Attributes\\DataProvider;\nuse PHPUnit\\Framework\\TestCase;\nuse Tests\\Support\\Architecture\\FooGuard;\n\nfinal class FooArchitectureTest extends TestCase\n{\n" . ($body ?? self::FAILING . self::PASSING . self::REAL_TREE) . "}\n";
    }
}
