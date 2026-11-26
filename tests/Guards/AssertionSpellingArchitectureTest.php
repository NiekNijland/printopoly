<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\AssertionSpellingGuard;
use Tests\Support\Architecture\ListedFindings;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class AssertionSpellingArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\n\nnamespace Tests\\Unit;\n\nuse PHPUnit\\Framework\\TestCase;\n\nfinal class FooTest extends TestCase {\n    public function testWorks(): void {\n";

    private const string TAIL = "\n    }\n}\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function otherSpellings(): iterable
    {
        yield 'an assertion of PHPUnit on $this' => ['$this->assertSame(1, $a);', 'this-assert assertSame'];
        yield 'an assertion of PHPUnit on $this in another case' => ['$this->ASSERTCOUNT(1, $a);', 'this-assert ASSERTCOUNT'];
        yield 'an assertion of PHPUnit on $this that PHPUnit adds for files' => ['$this->assertFileExists($path);', 'this-assert assertFileExists'];
        yield 'an assertion of PHPUnit on static' => ['static::assertTrue($a);', 'static-assert assertTrue'];
        yield 'a loose comparison on self' => ['self::assertEquals(1, $a);', 'assert-equals assertEquals'];
        yield 'a loose comparison on $this' => ['$this->assertEquals(1, $a);', 'assert-equals assertEquals'];
        yield 'a loose negative comparison' => ['self::assertNotEquals(1, $a);', 'assert-equals assertNotEquals'];
        yield 'an assertion that cannot fail' => ['self::assertTrue(TRUE);', 'no-op-assert assertTrue'];
        yield 'the marker of a test without assertions' => ['$this->expectNotToPerformAssertions();', 'no-op-assert expectNotToPerformAssertions'];
    }

    #[DataProvider('otherSpellings')]
    public function test_finds_every_other_spelling_of_an_assertion(string $body, string $finding): void
    {
        self::assertSame(['tests/Unit/FooTest.php::FooTest::testWorks ' . $finding], $this->findings(['tests/Unit/FooTest.php' => self::HEAD . $body . self::TAIL]));
        self::assertStringContainsString('self::', AssertionSpellingGuard::explain('x this-assert assertSame'));
    }

    public function test_finds_the_attribute_of_a_test_without_assertions_and_a_spelling_in_a_support_class(): void
    {
        $test = "<?php\nuse PHPUnit\\Framework\\Attributes\\DoesNotPerformAssertions;\nfinal class FooTest extends TestCase {\n    #[DoesNotPerformAssertions]\n    public function testRuns(): void { run(); }\n}\n";
        $helper = "<?php\nfinal class FooHelpers {\n    public function check(): void { \$this->assertSame(1, 2); }\n}\n";

        self::assertSame([
            'tests/Support/FooHelpers.php::FooHelpers::check this-assert assertSame',
            'tests/Unit/FooTest.php::FooTest::testRuns no-op-assert DoesNotPerformAssertions',
        ], $this->findings(['tests/Unit/FooTest.php' => $test, 'tests/Support/FooHelpers.php' => $helper]));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function theOneSpelling(): iterable
    {
        yield 'an assertion of PHPUnit on self' => ['self::assertSame(1, $a);'];
        yield 'an assertion the framework adds to the test case' => ['$this->assertDatabaseHas(\'users\', []);'];
        yield 'an assertion of the project on $this' => ['$this->assertPdf($path);'];
        yield 'an assertion of the framework on a response' => ['$response->assertSee(\'x\');'];
        yield 'the class of PHPUnit by name' => ['Assert::assertSame(1, $a);'];
        yield 'an assertion that compares canonically' => ['self::assertEqualsCanonicalizing([1, 2], $a);'];
        yield 'assertTrue with a value' => ['self::assertTrue($a === true);'];
    }

    #[DataProvider('theOneSpelling')]
    public function test_accepts_the_one_spelling(string $body): void
    {
        self::assertSame([], $this->findings(['tests/Unit/FooTest.php' => self::HEAD . $body . self::TAIL]));
    }

    public function test_the_real_tree_holds_no_assertion_spelling_beyond_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $found = new AssertionSpellingGuard(new PhpFileInspector(), $root, 'tests')->violations();

        self::assertSame([], new ListedFindings($root . '/tests/Guards/lists/assertion-spelling.txt')->compare($found, AssertionSpellingGuard::explain(...)));
    }

    /**
     * @param array<string, string> $files
     * @return list<string>
     */
    private function findings(array $files): array
    {
        $root = SourceSandbox::create($files, '.checkout-');

        try {
            return new AssertionSpellingGuard(new PhpFileInspector(), $root, 'tests')->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
