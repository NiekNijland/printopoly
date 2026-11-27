<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Spatie\LaravelData\Data;
use Tests\Support\Architecture\DataNamingGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class DataNamingArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{array<string, string>, string}>
     */
    public static function dataClassesWithoutTheSuffix(): iterable
    {
        yield 'a class in a data folder' => [['app/Modules/Print/Data/PrintJob.php' => 'final class PrintJob {}'], 'app/Modules/Print/Data/PrintJob.php'];
        yield 'a class in the data folder of today' => [['app/Data/PrintJob.php' => 'final class PrintJob {}'], 'app/Data/PrintJob.php'];
        yield 'a DTO outside a data folder' => [['app/Print/PrintSummary.php' => 'use Spatie\\LaravelData\\Data; final class PrintSummary extends Data {}'], 'app/Print/PrintSummary.php'];
        yield 'a DTO by its full name' => [['app/Print/PrintSummary.php' => 'final class PrintSummary extends \\Spatie\\LaravelData\\Data {}'], 'app/Print/PrintSummary.php'];
        yield 'a DTO under an alias' => [['app/Print/PrintSummary.php' => 'use Spatie\\LaravelData\\Data as Dto; final class PrintSummary extends Dto {}'], 'app/Print/PrintSummary.php'];
        yield 'a DTO through a parent of the project' => [[
            'app/Print/BaseData.php' => 'abstract class BaseData extends \\Spatie\\LaravelData\\Data {}',
            'app/Print/PrintSummary.php' => 'final class PrintSummary extends BaseData {}',
        ], 'app/Print/PrintSummary.php'];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('dataClassesWithoutTheSuffix')]
    public function test_it_detects_a_dto_that_is_not_named_data(array $files, string $finding): void
    {
        [$findings, $explained] = $this->namesOf($files);

        self::assertSame([$finding], $findings);
        self::assertStringContainsString('is named `<X>Data`: rename it', implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function dataClassesThatPass(): iterable
    {
        yield 'a DTO with the suffix in a data folder' => [['app/Modules/Print/Data/PrintJobData.php' => 'final class PrintJobData extends \\Spatie\\LaravelData\\Data {}']];
        yield 'an abstract parent in a data folder' => [['app/Modules/Print/Data/Base.php' => 'abstract class Base extends \\Spatie\\LaravelData\\Data {}']];
        yield 'a class that extends another Data class' => [['app/Print/PrintSummary.php' => 'final class PrintSummary extends \\App\\Other\\Data {}']];
        yield 'a class in a folder whose name only starts with Data' => [['app/Database/Seeder.php' => 'final class Seeder {}']];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('dataClassesThatPass')]
    public function test_it_accepts_a_dto_named_data_and_the_near_misses(array $files): void
    {
        self::assertSame([], $this->namesOf($files)[0]);
    }

    public function test_it_names_the_file_relative_to_a_root_under_a_dot_directory(): void
    {
        self::assertSame(['app/Data/Seo.php'], $this->namesOf(['app/Data/Seo.php' => 'final class Seo {}'], '.checkout-')[0]);
    }

    public function test_it_names_every_dto_of_app_data(): void
    {
        self::assertSame([], new DataNamingGuard(new PhpFileInspector(), $this->root(), 'app', 'Data', Data::class)->findings());
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function namesOf(array $files, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create(array_map(static fn (string $source): string => "<?php\nnamespace App\\Print;\n" . $source . "\n", $files), $prefix);

        try {
            $guard = new DataNamingGuard(new PhpFileInspector(), $root, 'app', 'Data', Data::class);
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
