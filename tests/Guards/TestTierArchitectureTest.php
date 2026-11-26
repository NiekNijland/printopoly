<?php

declare(strict_types=1);

namespace Tests\Guards;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\ListedFindings;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\TestTierGuard;
use Tests\Support\SourceSandbox;

final class TestTierArchitectureTest extends TestCase
{
    private const string BASE = "<?php\n\nnamespace Tests;\n\nabstract class TestCase extends \\Illuminate\\Foundation\\Testing\\TestCase {}\n";

    private const string SHARED_BASE = "<?php\n\nnamespace Tests;\n\nabstract class FeatureTestCase extends TestCase {}\n";

    private const string DATABASE_TRAIT = "<?php\n\nnamespace Tests\\Concerns;\n\ntrait RefreshesStore {\n    protected function setUpRefreshesStore(): void {}\n}\n";

    private const string HELPER_TRAIT = "<?php\n\nnamespace Tests\\Concerns;\n\ntrait MakesThings {\n    use RefreshesStore;\n}\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function bootingUnitTests(): iterable
    {
        yield 'the booting base by import' => ["use Tests\\TestCase;\nfinal class FooTest extends TestCase {}", \Tests\TestCase::class];
        yield 'the booting base under an alias' => ["use Tests\\TestCase as Base;\nfinal class FooTest extends Base {}", \Tests\TestCase::class];
        yield 'the booting base by its full name' => ['final class FooTest extends \\Tests\\TestCase {}', \Tests\TestCase::class];
        yield 'the framework base' => ['final class FooTest extends \\Illuminate\\Foundation\\Testing\\TestCase {}', \Illuminate\Foundation\Testing\TestCase::class];
        yield 'a base that extends the booting base' => ["use Tests\\FeatureTestCase;\nfinal class FooTest extends FeatureTestCase {}", 'Tests\FeatureTestCase'];
        yield 'a database trait of the framework' => ["use Illuminate\\Foundation\\Testing\\RefreshDatabase;\nfinal class FooTest extends \\PHPUnit\\Framework\\TestCase { use RefreshDatabase; }", RefreshDatabase::class];
        yield 'a trait with a set-up hook of the framework' => ['final class FooTest extends \\PHPUnit\\Framework\\TestCase { use \\Tests\\Concerns\\RefreshesStore; }', 'Tests\Concerns\RefreshesStore'];
        yield 'a trait that uses such a trait' => ["use Tests\\Concerns\\{MakesThings};\nfinal class FooTest extends \\PHPUnit\\Framework\\TestCase { use MakesThings; }", 'Tests\Concerns\MakesThings'];
    }

    #[DataProvider('bootingUnitTests')]
    public function test_finds_every_way_a_unit_test_boots_the_application(string $body, string $type): void
    {
        self::assertContains('tests/Unit/FooTest.php boots ' . $type, $this->findings($body));
        self::assertStringContainsString(TestCase::class, TestTierGuard::explain('x'));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function pureUnitTests(): iterable
    {
        yield 'the pure base' => ["use PHPUnit\\Framework\\TestCase;\nfinal class FooTest extends TestCase {}"];
        yield 'a trait without a set-up hook' => ['final class FooTest extends \\PHPUnit\\Framework\\TestCase { use \\Tests\\Concerns\\Pure; }'];
        yield 'a class of the same short name elsewhere' => ["use App\\Testing\\TestCase;\nfinal class FooTest extends TestCase {}"];
    }

    #[DataProvider('pureUnitTests')]
    public function test_accepts_a_unit_test_that_boots_nothing(string $body): void
    {
        self::assertSame([], $this->findings($body));
    }

    public function test_reads_the_feature_tier_as_allowed_to_boot(): void
    {
        $root = SourceSandbox::create(['tests/TestCase.php' => self::BASE, 'tests/Feature/FooTest.php' => "<?php\nfinal class FooTest extends \\Tests\\TestCase {}\n", 'tests/Unit/BarTest.php' => "<?php\nfinal class BarTest extends \\PHPUnit\\Framework\\TestCase {}\n"], '.checkout-');

        try {
            self::assertSame([], new TestTierGuard(new PhpFileInspector(), $root, 'tests', 'tests/Unit')->violations());
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_the_real_tree_boots_no_unit_test_beyond_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $found = new TestTierGuard(new PhpFileInspector(), $root, 'tests', 'tests/Unit')->violations();

        self::assertSame([], new ListedFindings($root . '/tests/Guards/lists/test-tiers.txt')->compare($found, TestTierGuard::explain(...)));
    }

    /**
     * @return list<string>
     */
    private function findings(string $body): array
    {
        $root = SourceSandbox::create([
            'tests/TestCase.php' => self::BASE,
            'tests/FeatureTestCase.php' => self::SHARED_BASE,
            'tests/Concerns/RefreshesStore.php' => self::DATABASE_TRAIT,
            'tests/Concerns/MakesThings.php' => self::HELPER_TRAIT,
            'tests/Concerns/Pure.php' => "<?php\n\nnamespace Tests\\Concerns;\n\ntrait Pure {\n    private function helper(): int { return 1; }\n}\n",
            'tests/Unit/FooTest.php' => "<?php\n\nnamespace Tests\\Unit;\n\n" . $body . "\n",
        ], '.checkout-');

        try {
            return new TestTierGuard(new PhpFileInspector(), $root, 'tests', 'tests/Unit')->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
