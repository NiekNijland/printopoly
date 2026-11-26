<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\DeclarationInspector;
use Tests\Support\Architecture\TestClassGuard;
use Tests\Support\SourceSandbox;

final class TestClassArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string, string}>
     */
    public static function typesInTheWrongFile(): iterable
    {
        yield 'a second class in a test file' => ['tests/Feature/FooTest.php', "<?php\nfinal class FooTest {}\nfinal class FakeMailer {}\n", 'tests/Feature/FooTest.php extra-class FakeMailer'];
        yield 'an interface in a test file' => ['tests/Feature/FooTest.php', "<?php\nfinal class FooTest {}\ninterface Probe {}\n", 'tests/Feature/FooTest.php extra-class Probe'];
        yield 'an enum in a test file' => ['tests/Feature/FooTest.php', "<?php\nenum Kind { case A; }\nfinal class FooTest {}\n", 'tests/Feature/FooTest.php extra-class Kind'];
        yield 'a test class named apart from its file' => ['tests/Feature/FooTest.php', "<?php\nfinal class BarTest {}\n", 'tests/Feature/FooTest.php extra-class BarTest'];
        yield 'a fake beside the tests of a tier' => ['tests/Feature/FakeMailer.php', "<?php\nfinal class FakeMailer {}\n", 'tests/Feature/FakeMailer.php outside-support FakeMailer'];
        yield 'a trait at the root of the test folder' => ['tests/MakesUsers.php', "<?php\ntrait MakesUsers {}\n", 'tests/MakesUsers.php outside-support MakesUsers'];
    }

    #[DataProvider('typesInTheWrongFile')]
    public function test_finds_a_type_outside_its_file(string $path, string $source, string $finding): void
    {
        self::assertSame([$finding], $this->findings([$path => $source]));
        self::assertStringContainsString('support folder', TestClassGuard::explain($finding));
    }

    public function test_accepts_one_test_class_per_file_support_classes_and_anonymous_doubles(): void
    {
        self::assertSame([], $this->findings([
            'tests/Feature/FooTest.php' => "<?php\nfinal class FooTest {\n    public function testWorks(): void { \$fake = new class() implements \\Countable { public function count(): int { return 0; } }; }\n}\n",
            'tests/Support/FakeMailer.php' => "<?php\nfinal class FakeMailer {}\n",
            'tests/Concerns/MakesUsers.php' => "<?php\ntrait MakesUsers {}\n",
            'tests/TestCase.php' => "<?php\nabstract class TestCase {}\n",
        ]));
    }

    public function test_the_real_tree_holds_every_type_in_its_file(): void
    {
        $guard = new TestClassGuard(new DeclarationInspector(), dirname(__DIR__, 2), 'tests', ['tests/Support', 'tests/Concerns'], 'tests/TestCase.php');

        self::assertSame([], array_map(TestClassGuard::explain(...), $guard->violations()));
    }

    /**
     * @param array<string, string> $files
     * @return list<string>
     */
    private function findings(array $files): array
    {
        $root = SourceSandbox::create($files, '.checkout-');

        try {
            return new TestClassGuard(new DeclarationInspector(), $root, 'tests', ['tests/Support', 'tests/Concerns'], 'tests/TestCase.php')->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
