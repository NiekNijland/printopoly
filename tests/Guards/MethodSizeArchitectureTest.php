<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CountedList;
use Tests\Support\Architecture\MethodSizeGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class MethodSizeArchitectureTest extends TestCase
{
    private const string GUIDE = 'docs/guards/method-size.md';

    /**
     * @return iterable<string, array{array<string, string>, list<string>, string, 3?: string}>
     */
    public static function methodsOverTheirLimit(): iterable
    {
        yield 'a service method of 81 lines' => [
            ['app/Print/Runner.php' => self::php('final class Runner', self::method('public function run(): void', 81))],
            ['app/Print/Runner.php::Runner::run::81'],
            'Runner::run has 81 lines, over the limit of 80 for a method',
        ];
        yield 'a private method of 81 lines' => [
            ['app/Print/Runner.php' => self::php('final class Runner', self::method('private function load(): void', 81))],
            ['app/Print/Runner.php::Runner::load::81'],
            'split it by responsibility, never by line count, as docs/guards/method-size.md says',
        ];
        yield 'a static method of 81 lines' => [
            ['app/Print/Runner.php' => self::php('final class Runner', self::method('public static function make(): void', 81))],
            ['app/Print/Runner.php::Runner::make::81'],
            'Runner::make has 81 lines',
        ];
        yield 'a controller action of 41 lines' => [
            ['app/Http/Controllers/Editions/ShowEditionController.php' => self::php('final readonly class ShowEditionController', self::method('public function __invoke(): void', 41))],
            ['app/Http/Controllers/Editions/ShowEditionController.php::ShowEditionController::__invoke::41'],
            'and 40 for a controller action',
        ];
        yield 'a second public method of a controller of 41 lines' => [
            ['app/Http/Controllers/Editions/ShowEditionController.php' => self::php('final readonly class ShowEditionController', self::method('public function show(): void', 41))],
            ['app/Http/Controllers/Editions/ShowEditionController.php::ShowEditionController::show::41'],
            'show has 41 lines',
        ];
        yield 'a private method of a controller of 81 lines' => [
            ['app/Http/Controllers/Editions/ShowEditionController.php' => self::php('final readonly class ShowEditionController', self::method('private function load(): void', 81))],
            ['app/Http/Controllers/Editions/ShowEditionController.php::ShowEditionController::load::81'],
            'has 81 lines',
        ];
        yield 'a trait method of 81 lines' => [
            ['app/Print/Runs.php' => self::php('trait Runs', self::method('public function run(): void', 81))],
            ['app/Print/Runs.php::Runs::run::81'],
            'Runs::run has 81 lines',
        ];
        yield 'an enum method of 81 lines' => [
            ['app/Enums/PrintPart.php' => self::php('enum PrintPart: string', self::method('public function label(): string', 81))],
            ['app/Enums/PrintPart.php::PrintPart::label::81'],
            'PrintPart::label has 81 lines',
        ];
        yield 'a method of an anonymous class' => [
            ['app/Support/Maker.php' => "<?php\n\ndeclare(strict_types=1);\n\nreturn new class {\n" . self::method('public function make(): void', 90) . "};\n"],
            ['app/Support/Maker.php::class@anonymous::make::90'],
            'class@anonymous::make has 90 lines',
        ];
        yield 'a method that a long closure makes long' => [
            ['app/Print/Runner.php' => self::php('final class Runner', "    public function run(): void\n    {\n        \$f = function (): void {\n" . self::body(80) . "        };\n    }\n")],
            ['app/Print/Runner.php::Runner::run::85'],
            'Runner::run has 85 lines',
        ];
        yield 'a method with a signature over many lines' => [
            ['app/Print/Runner.php' => self::php('final class Runner', "    public function run(\n" . str_repeat("        int \$a,\n", 10) . "        int \$last,\n    ): void {\n" . self::body(70) . "    }\n")],
            ['app/Print/Runner.php::Runner::run::84'],
            'Runner::run has 84 lines',
        ];
        yield 'a file the parser cannot read' => [
            ['app/Print/Broken.php' => "<?php\n\nfinal class Broken {\n"],
            ['unreadable app/Print/Broken.php: Syntax error, unexpected EOF on line 4'],
            'unreadable app/Print/Broken.php',
        ];
        yield 'a guide that lost the sentence with the limits' => [
            ['app/Print/Runner.php' => self::php('final class Runner', self::method('public function run(): void', 10))],
            ['guide ' . self::GUIDE],
            'no longer holds the sentence the guard reads',
            "# Guard: method-size\n\nEen methode is kort.\n",
        ];
    }

    /**
     * @param array<string, string> $files
     * @param list<string> $findings
     */
    #[Test]
    #[DataProvider('methodsOverTheirLimit')]
    public function it_fails_a_method_over_its_limit_a_controller_action_over_its_own_and_a_guide_without_the_sentence(array $files, array $findings, string $words, ?string $guide = null): void
    {
        [$found, $explained] = $this->sizesOf($files, $guide);

        self::assertSame($findings, $found);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function methodsInsideTheirLimit(): iterable
    {
        yield 'a method of 80 lines' => [['app/Print/Runner.php' => self::php('final class Runner', self::method('public function run(): void', 80))]];
        yield 'a controller action of 40 lines' => [['app/Http/Controllers/Editions/ShowEditionController.php' => self::php('final readonly class ShowEditionController', self::method('public function __invoke(): void', 40))]];
        yield 'a private helper of 60 lines in a controller' => [['app/Http/Controllers/Editions/ShowEditionController.php' => self::php('final readonly class ShowEditionController', self::method('private function load(): void', 60))]];
        yield 'a constructor of 60 lines in a controller' => [['app/Http/Controllers/Editions/ShowEditionController.php' => self::php('final readonly class ShowEditionController', self::method('public function __construct()', 60))]];
        yield 'a method of 60 lines in a folder that only looks like a controller folder' => [['app/Print/ControllersMap.php' => self::php('final class ControllersMap', self::method('public function run(): void', 60))]];
        yield 'a long docblock and attributes above a short method' => [['app/Print/Runner.php' => self::php('final class Runner', "    /**\n" . str_repeat("     * @param int \$a\n", 90) . "     */\n    #[\\Deprecated]\n" . self::method('public function run(): void', 10))]];
        yield 'an interface method' => [['app/Print/Runs.php' => self::php('interface Runs', "    public function run(): void;\n")]];
        yield 'a long closure outside a class' => [['app/Support/helpers.php' => "<?php\n\ndeclare(strict_types=1);\n\n\$f = function (): void {\n" . str_repeat("    \$value = 1;\n", 200) . "};\n"]];
        yield 'two methods of one class that together pass the limit' => [['app/Print/Runner.php' => self::php('final class Runner', self::method('public function one(): void', 50) . self::method('public function two(): void', 50))]];
    }

    /**
     * @param array<string, string> $files
     */
    #[Test]
    #[DataProvider('methodsInsideTheirLimit')]
    public function it_passes_a_method_at_its_limit_and_the_code_the_limit_does_not_apply_to(array $files): void
    {
        self::assertSame([], $this->sizesOf($files)[0]);
    }

    #[Test]
    public function it_names_the_file_relative_to_a_root_under_a_dot_directory(): void
    {
        self::assertSame(['app/Print/Runner.php::Runner::run::81'], $this->sizesOf(['app/Print/Runner.php' => self::php('final class Runner', self::method('public function run(): void', 81))], prefix: '.checkout-')[0]);
    }

    #[Test]
    public function it_keeps_every_method_of_app_inside_the_limits_of_the_guide_or_on_the_counted_list(): void
    {
        $guard = new MethodSizeGuard(new PhpFileInspector(), $this->root(), 'app', self::GUIDE, 'Controllers');

        self::assertSame([80, 40], $guard->limits());
        self::assertSame([], new CountedList($this->root(), 'lists/method-size.txt')->violations($guard->findings(), $guard->explain(...)));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function sizesOf(array $files, ?string $guide = null, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create([self::GUIDE => $guide ?? (string) file_get_contents($this->root() . '/' . self::GUIDE), ...$files], $prefix);

        try {
            $guard = new MethodSizeGuard(new PhpFileInspector(), $root, 'app', self::GUIDE, 'Controllers');
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private static function php(string $kind, string $members): string
    {
        return "<?php\n\ndeclare(strict_types=1);\n\nnamespace App\\Print;\n\n{$kind}\n{\n{$members}}\n";
    }

    private static function method(string $head, int $lines): string
    {
        return "    {$head}\n    {\n" . self::body($lines - 3) . "    }\n";
    }

    private static function body(int $lines): string
    {
        return str_repeat("        \$value = 1;\n", $lines);
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
