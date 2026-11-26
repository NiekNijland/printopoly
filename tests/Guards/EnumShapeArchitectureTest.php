<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CountedList;
use Tests\Support\Architecture\EnumShapeGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class EnumShapeArchitectureTest extends TestCase
{
    private const string PATH = 'app/Modules/Print/Enums/PrintPart.php';

    /**
     * @return iterable<string, array{string, list<string>, string, 3?: string}>
     */
    public static function enumsThatBreakTheRule(): iterable
    {
        yield 'a pure enum' => ['enum PrintPart { case BOARD; }', ['backing'], 'an enum is backed by a string: declare it `enum X: string`'];
        yield 'an integer enum' => ['enum PrintPart: int { case BOARD = 1; }', ['backing'], 'backed by a string'];
        yield 'an integer enum outside the enums folder' => ['enum PrintPart: int { case BOARD = 1; }', ['backing'], 'backing', 'app/Print/PrintPart.php'];
        yield 'a case in pascal case' => ["enum PrintPart: string { case Board = 'board'; }", ['cases'], 'written in UPPER_CASE'];
        yield 'a case in camel case after an upper case one' => ["enum PrintPart: string { case BOARD = 'board'; case boxLid = 'box_lid'; }", ['cases'], 'the values stay'];
        yield 'a pure enum in pascal case' => ['enum PrintPart { case Board; }', ['backing', 'cases'], 'cases'];
        yield 'a class in the enums folder' => ['final class PrintPart {}', ['not-enum'], 'the enums folder holds enums only'];
        yield 'an interface in the enums folder' => ['interface PrintPart {}', ['not-enum'], 'not-enum'];
    }

    /**
     * @param list<string> $rules
     */
    #[Test]
    #[DataProvider('enumsThatBreakTheRule')]
    public function it_detects_an_enum_that_is_not_string_backed_with_upper_case_cases_or_a_class_in_the_enums_folder(string $source, array $rules, string $words, string $path = self::PATH): void
    {
        [$findings, $explained] = $this->shapeOf([$path => "<?php\nnamespace App;\n" . $source . "\n"]);

        self::assertSame(array_map(static fn (string $rule): string => $rule . ' ' . $path, $rules), $findings);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function enumsThatPass(): iterable
    {
        yield 'a string enum with upper case cases and a constant' => [[self::PATH => "enum PrintPart: string { case BOARD = 'board'; case BOX_LID = 'box_lid'; const Default = self::BOARD; }"]];
        yield 'cases with digits' => [[self::PATH => "enum PrintPart: string { case A4 = 'a4'; case PAGE_2 = 'page_2'; }"]];
        yield 'the backing type in capitals' => [[self::PATH => "enum PrintPart: STRING { case BOARD = 'board'; }"]];
        yield 'a class with a mixed case constant outside the enums folder' => [['app/Print/PrintLayout.php' => 'final class PrintLayout { public const Mixed = 1; }']];
    }

    /**
     * @param array<string, string> $files
     */
    #[Test]
    #[DataProvider('enumsThatPass')]
    public function it_accepts_a_string_backed_enum_with_upper_case_cases(array $files): void
    {
        self::assertSame([], $this->shapeOf(array_map(static fn (string $source): string => "<?php\nnamespace App;\n" . $source . "\n", $files))[0]);
    }

    #[Test]
    public function it_names_the_file_relative_to_a_root_under_a_dot_directory(): void
    {
        self::assertSame(['backing app/Enums/Level.php'], $this->shapeOf(['app/Enums/Level.php' => "<?php\nenum Level: int { case LOW = 1; }\n"], '.checkout-')[0]);
    }

    #[Test]
    public function it_backs_every_enum_of_app_by_a_string_with_upper_case_cases_or_lists_it(): void
    {
        $guard = new EnumShapeGuard(new PhpFileInspector(), $this->root(), 'app', 'Enums');

        self::assertSame([], new CountedList($this->root(), 'lists/enum-shape.txt')->violations($guard->findings(), $guard->explain(...)));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function shapeOf(array $files, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create($files, $prefix);

        try {
            $guard = new EnumShapeGuard(new PhpFileInspector(), $root, 'app', 'Enums');
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
