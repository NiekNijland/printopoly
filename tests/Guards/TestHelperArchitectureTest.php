<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\DeclarationInspector;
use Tests\Support\Architecture\TestHelperGuard;
use Tests\Support\SourceSandbox;

final class TestHelperArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string, string}>
     */
    public static function helpersInTheWrongPlace(): iterable
    {
        yield 'a function in a test file' => ['tests/Feature/FooTest.php', "<?php\nfunction makeUser(): int { return 1; }\nfinal class FooTest {}\n", 'tests/Feature/FooTest.php::makeUser() helper-function'];
        yield 'a function in a namespace of a support file' => ['tests/Support/functions.php', "<?php\nnamespace Tests\\Support;\nfunction makeUser(): int { return 1; }\n", 'tests/Support/functions.php::makeUser() helper-function'];
        yield 'a helper method of a test trait' => ['tests/Concerns/MakesUsers.php', "<?php\ntrait MakesUsers {\n    protected function makeUser(): int { return 1; }\n}\n", 'tests/Concerns/MakesUsers.php::MakesUsers::makeUser helper-trait'];
        yield 'a static helper of a test trait' => ['tests/Concerns/MakesUsers.php', "<?php\ntrait MakesUsers {\n    public static function makeUser(): int { return 1; }\n}\n", 'tests/Concerns/MakesUsers.php::MakesUsers::makeUser helper-trait'];
        yield 'the set-up hook of another trait' => ['tests/Concerns/MakesUsers.php', "<?php\ntrait MakesUsers {\n    protected function setUpMakesThings(): void {}\n}\n", 'tests/Concerns/MakesUsers.php::MakesUsers::setUpMakesThings helper-trait'];
        yield 'a helper method on the base test case' => ['tests/TestCase.php', "<?php\nabstract class TestCase extends \\Illuminate\\Foundation\\Testing\\TestCase {\n    protected function signIn(): void {}\n}\n", 'tests/TestCase.php::TestCase::signIn helper-on-base'];
        yield 'a helper method on another shared base' => ['tests/FeatureTestCase.php', "<?php\nabstract class FeatureTestCase extends TestCase {\n    public function signIn(): void {}\n}\n", 'tests/FeatureTestCase.php::FeatureTestCase::signIn helper-on-base'];
    }

    #[DataProvider('helpersInTheWrongPlace')]
    public function test_finds_a_helper_outside_a_final_support_class(string $path, string $source, string $finding): void
    {
        self::assertSame([$finding], $this->findings([$path => $source]));
        self::assertStringContainsString('public static method of a final class', TestHelperGuard::explain($finding));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function helpersInTheirPlace(): iterable
    {
        yield 'a final support class with static helpers' => ['tests/Support/Feature/Editions/EditionApiHelpers.php', "<?php\nfinal class EditionApiHelpers {\n    public static function payload(): array { return []; }\n}\n"];
        yield 'the set-up and tear-down hooks of a trait' => ['tests/Concerns/RefreshesStore.php', "<?php\ntrait RefreshesStore {\n    protected function setUpRefreshesStore(): void {}\n    protected function tearDownRefreshesStore(): void {}\n}\n"];
        yield 'the hooks a base test case overrides' => ['tests/TestCase.php', "<?php\nabstract class TestCase extends \\Illuminate\\Foundation\\Testing\\TestCase {\n    #[\\Override]\n    protected function setUp(): void {}\n    #[\\Override]\n    public function createApplication(): mixed { return null; }\n}\n"];
        yield 'private helpers of one final test class' => ['tests/Feature/FooTest.php', "<?php\nfinal class FooTest {\n    private function payload(): array { return []; }\n}\n"];
        yield 'a closure in a test' => ['tests/Feature/FooTest.php', "<?php\nfinal class FooTest {\n    public function testWorks(): void { \$f = function (): int { return 1; }; }\n}\n"];
    }

    #[DataProvider('helpersInTheirPlace')]
    public function test_accepts_helpers_in_a_final_support_class_and_the_hooks(string $path, string $source): void
    {
        self::assertSame([], $this->findings([$path => $source]));
    }

    public function test_the_real_tree_holds_no_helper(): void
    {
        $root = dirname(__DIR__, 2);
        $found = new TestHelperGuard(new DeclarationInspector(), $root, 'tests')->violations();

        self::assertSame([], array_map(TestHelperGuard::explain(...), $found));
    }

    /**
     * @param array<string, string> $files
     * @return list<string>
     */
    private function findings(array $files): array
    {
        $root = SourceSandbox::create($files, '.checkout-');

        try {
            return new TestHelperGuard(new DeclarationInspector(), $root, 'tests')->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
