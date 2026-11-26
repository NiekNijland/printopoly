<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\DeclarationInspector;
use Tests\Support\Architecture\ListedFindings;
use Tests\Support\Architecture\TestDeclarationGuard;
use Tests\Support\SourceSandbox;

final class TestDeclarationArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\n\nnamespace Tests\\Unit;\n\nuse PHPUnit\\Framework\\TestCase;\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function otherSpellings(): iterable
    {
        yield 'the attribute' => [self::HEAD . "use PHPUnit\\Framework\\Attributes\\Test;\nfinal class FooTest extends TestCase {\n    #[Test]\n    public function it_works(): void {}\n}\n", 'FooTest::it_works test-attribute'];
        yield 'the attribute under an alias' => [self::HEAD . "use PHPUnit\\Framework\\Attributes\\Test as Case_;\nfinal class FooTest extends TestCase {\n    #[Case_]\n    public function works(): void {}\n}\n", 'FooTest::works test-attribute'];
        yield 'the attribute by its full name' => [self::HEAD . "final class FooTest extends TestCase {\n    #[\\PHPUnit\\Framework\\Attributes\\Test]\n    public function works(): void {}\n}\n", 'FooTest::works test-attribute'];
        yield 'the attribute in a group with another' => [self::HEAD . "use PHPUnit\\Framework\\Attributes as A;\nfinal class FooTest extends TestCase {\n    #[A\\Small, A\\Test]\n    public function works(): void {}\n}\n", 'FooTest::works test-attribute'];
        yield 'the annotation' => [self::HEAD . "final class FooTest extends TestCase {\n    /** @test */\n    public function works(): void {}\n}\n", 'FooTest::works test-annotation'];
        yield 'a camel case name' => [self::HEAD . "final class FooTest extends TestCase {\n    public function testItWorks(): void {}\n}\n", 'FooTest::testItWorks test-name'];
        yield 'a name with no sentence' => [self::HEAD . "final class FooTest extends TestCase {\n    public function testworks(): void {}\n}\n", 'FooTest::testworks test-name'];
        yield 'a name with capitals after the prefix' => [self::HEAD . "final class FooTest extends TestCase {\n    public function test_It_Works(): void {}\n}\n", 'FooTest::test_It_Works test-name'];
        yield 'a test without a return type' => [self::HEAD . "final class FooTest extends TestCase {\n    public function test_works() {}\n}\n", 'FooTest::test_works test-void'];
        yield 'a test with another return type' => [self::HEAD . "final class FooTest extends TestCase {\n    public function test_works(): ?int { return null; }\n}\n", 'FooTest::test_works test-void'];
        yield 'a provider in an annotation' => [self::HEAD . "final class FooTest extends TestCase {\n    /** @dataProvider cases */\n    public function test_works(int \$a): void {}\n}\n", 'FooTest::test_works provider-annotation'];
        yield 'a group annotation on a method' => [self::HEAD . "final class FooTest extends TestCase {\n    /** @group slow */\n    public function test_works(): void {}\n}\n", 'FooTest::test_works group-annotation'];
        yield 'a group annotation on the class' => [self::HEAD . "/** @group slow */\nfinal class FooTest extends TestCase {\n    public function test_works(): void {}\n}\n", 'FooTest group-annotation'];
    }

    #[DataProvider('otherSpellings')]
    public function test_finds_every_other_spelling_of_a_test_declaration(string $source, string $finding): void
    {
        self::assertSame(['tests/Unit/FooTest.php::' . $finding], $this->findings(['tests/Unit/FooTest.php' => $source]));
        self::assertStringContainsString('test_refuses_an_expired_token', TestDeclarationGuard::explain('x test-name'));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function theOneSpelling(): iterable
    {
        yield 'a test method with a sentence name' => [self::HEAD . "final class FooTest extends TestCase {\n    public function test_refuses_an_expired_token(): void {}\n    public function test_keeps_40_spaces(): void {}\n}\n"];
        yield 'a provider attribute and a static provider' => [self::HEAD . "use PHPUnit\\Framework\\Attributes\\DataProvider;\nfinal class FooTest extends TestCase {\n    public static function cases(): iterable { yield [1]; }\n    #[DataProvider('cases')]\n    public function test_counts_up(int \$a): void {}\n}\n"];
        yield 'helpers and hooks that are no tests' => [self::HEAD . "final class FooTest extends TestCase {\n    protected function setUp(): void {}\n    private function tester(): int { return 1; }\n    private function test_helper() {}\n}\n"];
        yield 'another attribute named Test in another namespace' => [self::HEAD . "use App\\Attributes\\Test;\nfinal class FooTest extends TestCase {\n    #[Test]\n    public function works(): void {}\n}\n"];
        yield 'the annotation words in prose' => [self::HEAD . "/** @author the testers of the latest group */\nfinal class FooTest extends TestCase {\n    /** @testWith [1] */\n    public function test_counts_up(int \$a): void {}\n}\n"];
    }

    #[DataProvider('theOneSpelling')]
    public function test_accepts_the_one_spelling_and_what_is_no_test(string $source): void
    {
        self::assertSame([], $this->findings(['tests/Unit/FooTest.php' => $source]));
    }

    public function test_reads_only_test_files_under_a_dot_directory(): void
    {
        $support = "<?php\nfinal class Helpers {\n    public function test_helper() {}\n}\n";
        $test = self::HEAD . "final class BarTest extends TestCase {\n    public function testItWorks(): void {}\n}\n";

        self::assertSame(['tests/Unit/BarTest.php::BarTest::testItWorks test-name'], $this->findings(['tests/Support/Helpers.php' => $support, 'tests/Unit/BarTest.php' => $test]));
    }

    public function test_the_real_tree_holds_no_declaration_beyond_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $found = new TestDeclarationGuard(new DeclarationInspector(), $root, 'tests')->violations();

        self::assertSame([], new ListedFindings($root . '/tests/Guards/lists/test-declarations.txt')->compare($found, TestDeclarationGuard::explain(...)));
    }

    /**
     * @param array<string, string> $files
     * @return list<string>
     */
    private function findings(array $files): array
    {
        $root = SourceSandbox::create($files, '.checkout-');

        try {
            return new TestDeclarationGuard(new DeclarationInspector(), $root, 'tests')->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
