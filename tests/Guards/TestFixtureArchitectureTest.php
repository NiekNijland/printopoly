<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\DeclarationInspector;
use Tests\Support\Architecture\ListedFindings;
use Tests\Support\Architecture\TestFixtureGuard;
use Tests\Support\SourceSandbox;

final class TestFixtureArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string}>
     */
    public static function sharedFixtures(): iterable
    {
        yield 'a property set in setUp' => ["    protected function setUp(): void {\n        parent::setUp();\n        \$this->user = User::factory()->create();\n    }", 'FooTest::setUp fixture user'];
        yield 'a property set inside a condition of setUp' => ["    protected function setUp(): void {\n        if (true) { \$this->path = '/tmp/x'; }\n    }", 'FooTest::setUp fixture path'];
        yield 'a property added to in setUp' => ["    protected function setUp(): void {\n        \$this->count += 1;\n    }", 'FooTest::setUp fixture count'];
        yield 'a property set by reference in setUp' => ["    protected function setUp(): void {\n        \$this->rows = &\$rows;\n    }", 'FooTest::setUp fixture rows'];
        yield 'a property set in a method with the Before attribute' => ["    #[\\PHPUnit\\Framework\\Attributes\\Before]\n    public function prepare(): void {\n        \$this->user = 1;\n    }", 'FooTest::prepare fixture user'];
        yield 'a property set in the set-up hook of a trait' => ["    protected function setUpMakesUsers(): void {\n        \$this->user = 1;\n    }", 'FooTest::setUpMakesUsers fixture user'];
    }

    #[DataProvider('sharedFixtures')]
    public function test_finds_test_data_that_the_set_up_shares_with_every_test(string $method, string $finding): void
    {
        self::assertSame(['tests/Feature/FooTest.php::' . $finding], $this->findings($method));
        self::assertStringContainsString('local variables', TestFixtureGuard::explain($finding));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function localState(): iterable
    {
        yield 'a local variable in a test' => ["    public function testWorks(): void {\n        \$user = User::factory()->create();\n    }"];
        yield 'a property set in a test' => ["    public function testWorks(): void {\n        \$this->seen = true;\n    }"];
        yield 'a property of another object in setUp' => ["    protected function setUp(): void {\n        \$other->user = 1;\n        \$this->user->name = 'x';\n    }"];
        yield 'a tear-down that resets' => ["    protected function tearDown(): void {\n        \$this->user = null;\n    }"];
    }

    #[DataProvider('localState')]
    public function test_accepts_state_that_a_test_builds_itself(string $method): void
    {
        self::assertSame([], $this->findings($method));
    }

    public function test_the_real_tree_shares_no_fixture_beyond_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $found = new TestFixtureGuard(new DeclarationInspector(), $root, 'tests')->violations();

        self::assertSame([], new ListedFindings($root . '/tests/Guards/lists/test-fixtures.txt')->compare($found, TestFixtureGuard::explain(...)));
    }

    /**
     * @return list<string>
     */
    private function findings(string $method): array
    {
        $root = SourceSandbox::create(['tests/Feature/FooTest.php' => "<?php\nfinal class FooTest {\n" . $method . "\n}\n"], '.checkout-');

        try {
            return new TestFixtureGuard(new DeclarationInspector(), $root, 'tests')->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
