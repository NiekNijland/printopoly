<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\ListedFindings;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\TestLocationGuard;
use Tests\Support\SourceSandbox;

final class TestLocationArchitectureTest extends TestCase
{
    private const array APP = [
        'app/Http/Controllers/Editions/ShowController.php' => "<?php\n",
        'app/Actions/Editions/StoreEdition.php' => "<?php\n",
        'app/Print/PrintLayout.php' => "<?php\n",
        'app/Enums/Locale.php' => "<?php\n",
        'app/Support/Locale.php' => "<?php\n",
    ];

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function awayFromTheirCode(): iterable
    {
        yield 'a folder the app does not have' => ['tests/Feature/Editor/FlowTest.php', 'tests/Feature/Editor/FlowTest.php no-folder app/Editor'];
        yield 'a nested folder the app does not have' => ['tests/Feature/Actions/Editions/Nested/FlowTest.php', 'no-folder app/Actions/Editions/Nested'];
        yield 'a class in another folder of the same tier' => ['tests/Unit/Actions/StoreEditionTest.php', 'tests/Unit/Actions/StoreEditionTest.php belongs-in tests/Unit/Actions/Editions'];
        yield 'a class at the root of the tier' => ['tests/Unit/PrintLayoutTest.php', 'belongs-in tests/Unit/Print'];
        yield 'a class that two folders hold' => ['tests/Unit/LocaleTest.php', 'belongs-in tests/Unit/Enums or tests/Unit/Support'];
        yield 'a controller test away from its controller' => ['tests/Feature/Editions/ShowControllerTest.php', 'belongs-in tests/Feature/Http/Controllers/Editions'];
    }

    #[DataProvider('awayFromTheirCode')]
    public function test_finds_a_test_away_from_the_code_it_covers(string $test, string $finding): void
    {
        $found = $this->findings($test);

        self::assertCount(1, $found);
        self::assertStringStartsWith($test . ' ', $found[0]);
        self::assertStringContainsString($finding, $found[0]);
        self::assertStringContainsString('folder', TestLocationGuard::explain($found[0]));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function besideTheirCode(): iterable
    {
        yield 'a unit test beside its class' => ['tests/Unit/Print/PrintLayoutTest.php'];
        yield 'an action test beside its action' => ['tests/Feature/Actions/Editions/StoreEditionTest.php'];
        yield 'a controller test beside its controller' => ['tests/Feature/Http/Controllers/Editions/ShowControllerTest.php'];
        yield 'a flow test in a folder of the app' => ['tests/Feature/Http/Controllers/Editions/EditionFlowTest.php'];
        yield 'a flow test at the root of the tier' => ['tests/Feature/HealthTest.php'];
        yield 'a file that is no test' => ['tests/Unit/Editor/Helpers.php'];
        yield 'a test outside the tiers' => ['tests/Smoke/SmokeTest.php'];
    }

    #[DataProvider('besideTheirCode')]
    public function test_accepts_a_test_beside_the_code_it_covers(string $test): void
    {
        self::assertSame([], $this->findings($test));
    }

    public function test_the_real_tree_holds_no_misplaced_test_beyond_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $found = new TestLocationGuard(new PhpFileInspector(), $root, 'app', 'tests', ['Unit', 'Feature'])->violations();

        self::assertSame([], new ListedFindings($root . '/tests/Guards/lists/test-locations.txt')->compare($found, TestLocationGuard::explain(...)));
    }

    /**
     * @return list<string>
     */
    private function findings(string $test): array
    {
        $root = SourceSandbox::create([...self::APP, $test => "<?php\n"], '.checkout-');

        try {
            return new TestLocationGuard(new PhpFileInspector(), $root, 'app', 'tests', ['Unit', 'Feature'])->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
