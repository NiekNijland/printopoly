<?php

declare(strict_types=1);

namespace Tests\Guards;

use App\Models\Asset;
use App\Models\Edition;
use App\Models\PrintJob;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Connection;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\PureLayerGuard;
use Tests\Support\SourceSandbox;

final class PureLayerArchitectureTest extends TestCase
{
    private const string GUIDE = 'docs/guards/pure-layers.md';

    private const array DATABASE = ['App\\Models\\', 'Illuminate\\Database\\', DB::class, Schema::class, 'MongoDB\\'];

    /**
     * @return iterable<string, array{string, string, string}>
     */
    public static function pureClassesThatTouchTheDatabase(): iterable
    {
        yield 'an enum that names a model' => ['app/Modules/Print/Enums/PrintPart.php', "use App\\Models\\PrintJob;\nenum PrintPart: string { case BOARD = PrintJob::BOARD; }", 'names App\\Models\\PrintJob'];
        yield 'a value object with a model parameter' => ['app/Modules/Photos/ValueObjects/PhotoCrop.php', 'final readonly class PhotoCrop { public function __construct(\\App\\Models\\Asset $asset) {} }', Asset::class];
        yield 'a contract that returns a query builder' => ['app/Modules/Print/Contracts/Finder.php', "use Illuminate\\Database\\Eloquent\\Builder;\ninterface Finder { public function query(): Builder; }", Builder::class];
        yield 'an exception that calls the facade' => ['app/Modules/Print/Exceptions/PrintFailedException.php', "use Illuminate\\Support\\Facades\\DB;\nfinal class PrintFailedException extends \\RuntimeException { public function count(): int { return DB::connection()->getQueryLog() ? 1 : 0; } }", DB::class];
        yield 'the domain-free support folder with a Mongo connection' => ['app/Support/FeatureCounter.php', "use MongoDB\\Laravel\\Connection;\nfinal class FeatureCounter { public function __construct(private Connection \$connection) {} }", Connection::class];
        yield 'a model class name in a string' => ['app/Modules/Print/Enums/PrintPart.php', "enum PrintPart: string { case BOARD = 'board'; public function model(): string { return 'App\\\\Models\\\\PrintJob'; } }", PrintJob::class];
        yield 'a model named in a from* factory of a value object' => ['app/Modules/Photos/ValueObjects/PhotoCrop.php', 'final readonly class PhotoCrop { public static function fromAsset(\\App\\Models\\Asset $asset): self { return new self(); } }', Asset::class];
        yield 'a DTO with a model in a property default' => ['app/Modules/Print/Data/PrintSetChoiceData.php', "use App\\Models\\PrintJob;\nfinal class PrintSetChoiceData { public function __construct(public int \$invitations = PrintJob::DEFAULT_INVITATIONS) {} }", PrintJob::class];
        yield 'a DTO with the facade in a from* factory' => ['app/Data/SeoData.php', "use Illuminate\\Support\\Facades\\DB;\nfinal class SeoData { public static function fromPage(): self { DB::connection(); return new self(); } }", DB::class];
        yield 'a DTO with a model in an instance method' => ['app/Data/EditionSummaryData.php', "use App\\Models\\Edition;\nfinal class EditionSummaryData { public function edition(): ?Edition { return Edition::query()->first(); } }", Edition::class];
    }

    #[DataProvider('pureClassesThatTouchTheDatabase')]
    public function test_it_detects_a_pure_layer_that_names_a_model_or_the_database(string $path, string $source, string $words): void
    {
        [$findings, $explained] = $this->layersOf([$path => "<?php\nnamespace App\\Pure;\n" . $source . "\n"]);

        self::assertSame([$path], $findings);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function classesThatPass(): iterable
    {
        yield 'a DTO that names a model only in its from* factory' => ['app/Modules/Print/Data/PrintJobData.php', "use App\\Models\\PrintJob;\nfinal class PrintJobData { public function __construct(public string \$id) {} public static function fromModel(PrintJob \$job): self { return new self(\$job->id); } }"];
        yield 'a value object with scalars' => ['app/Modules/Photos/ValueObjects/PhotoCrop.php', 'final readonly class PhotoCrop { public function __construct(public int $x) {} }'];
        yield 'a module support class that names a model' => ['app/Modules/Print/Support/PrintChannel.php', "use App\\Models\\PrintJob;\nfinal class PrintChannel { public function of(PrintJob \$job): string { return 'x'; } }"];
        yield 'a service that names a model' => ['app/Modules/Print/Services/PrintService.php', "use App\\Models\\PrintJob;\nfinal class PrintService { public function find(): ?PrintJob { return null; } }"];
        yield 'a class whose name only starts like a model namespace' => ['app/Support/ModelsMap.php', 'final class ModelsMap { public function of(): string { return \\App\\ModelsMap::class; } }'];
    }

    #[DataProvider('classesThatPass')]
    public function test_it_accepts_a_factory_crossing_and_the_layers_that_may_name_a_model(string $path, string $source): void
    {
        self::assertSame([], $this->layersOf([$path => "<?php\nnamespace App\\Pure;\n" . $source . "\n"])[0]);
    }

        public function test_it_fails_a_guide_that_lost_the_table_of_layers(): void
        {
        [$findings, $explained] = $this->layersOf(['app/Support/A.php' => "<?php\nfinal class A {}\n"], "# Guard: pure-layers\n");

        self::assertSame(['guide ' . self::GUIDE], $findings);
        self::assertStringContainsString('holds no table of pure layers', implode("\n", $explained));
    }

        public function test_it_names_the_file_relative_to_a_root_under_a_dot_directory(): void
        {
        self::assertSame(['app/Support/Counter.php'], $this->layersOf(['app/Support/Counter.php' => "<?php\nfinal class Counter { public function a(\\App\\Models\\User \$user): void {} }\n"], prefix: '.checkout-')[0]);
    }

        public function test_it_pins_the_layers_of_the_guide_and_keeps_them_pure(): void
        {
        $guard = new PureLayerGuard(new PhpFileInspector(), $this->root(), 'app', self::GUIDE, self::DATABASE);

        self::assertSame(['Contracts' => false, 'Enums' => false, 'Exceptions' => false, 'ValueObjects' => false, 'app/Support' => false, 'Data' => true], $guard->layers());
        self::assertSame([], $guard->explain($guard->findings()));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function layersOf(array $files, ?string $guide = null, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create([self::GUIDE => $guide ?? (string) file_get_contents($this->root() . '/' . self::GUIDE), ...$files], $prefix);

        try {
            $guard = new PureLayerGuard(new PhpFileInspector(), $root, 'app', self::GUIDE, self::DATABASE);
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
