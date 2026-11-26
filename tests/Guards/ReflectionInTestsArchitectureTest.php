<?php

declare(strict_types=1);

namespace Tests\Guards;

use Closure;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use Tests\Support\Architecture\ListedFindings;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\ReflectionInTestsGuard;
use Tests\Support\SourceSandbox;

final class ReflectionInTestsArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string}>
     */
    public static function reachesIntoAClass(): iterable
    {
        yield 'a private method' => ["\$m = new \\ReflectionMethod(Foo::class, 'secret');\n\$m->invoke(\$foo);", 'ReflectionMethod'];
        yield 'a private property under an import' => ["\$p = new ReflectionProperty(Foo::class, 'secret');", 'ReflectionProperty'];
        yield 'a private constant' => ["new \\ReflectionClassConstant(Foo::class, 'SECRET');", 'ReflectionClassConstant'];
        yield 'an object' => ['new \\ReflectionObject($foo);', 'ReflectionObject'];
        yield 'a class read beyond its public structure' => ["(new \\ReflectionClass(Foo::class))->getProperty('secret');", 'ReflectionClass'];
        yield 'a class in a variable read beyond its public structure' => ["\$class = new \\ReflectionClass(Foo::class);\n\$class->getMethod('secret');", 'ReflectionClass'];
        yield 'private methods of a class' => ["\$class = new \\ReflectionClass(Foo::class);\n\$class->getMethods();", 'ReflectionClass'];
        yield 'a member made accessible' => ['$member->setAccessible(true);', 'setAccessible'];
        yield 'a closure bound to an object' => ['$read->bindTo($foo, Foo::class);', 'bindTo'];
        yield 'a closure bound statically' => [Closure::class . '::bind($read, $foo, Foo::class);', 'Closure::bind'];
    }

    #[DataProvider('reachesIntoAClass')]
    public function test_finds_every_way_a_test_reaches_into_a_class(string $body, string $what): void
    {
        self::assertSame(['tests/Unit/FooTest.php::FooTest::testWorks reflection ' . $what], $this->findings($this->inMethod($body)));
        self::assertStringContainsString('public behavior', ReflectionInTestsGuard::explain('x'));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function publicStructure(): iterable
    {
        yield 'the attributes of a class' => ['(new \\ReflectionClass(Foo::class))->getAttributes();'];
        yield 'a class in a variable read for its public structure' => ["\$class = new \\ReflectionClass(Foo::class);\n\$class->isFinal();\n\$class->getShortName();"];
        yield 'the public methods of a class' => ['$class = new \ReflectionClass(Foo::class);
$class->getMethods(' . ReflectionMethod::class . '::IS_PUBLIC);'];
        yield 'a bind of the container' => ['app()->bind(Foo::class, fn () => new Foo());'];
    }

    #[DataProvider('publicStructure')]
    public function test_accepts_a_read_of_the_public_structure(string $body): void
    {
        self::assertSame([], $this->findings($this->inMethod($body)));
    }

    public function test_the_real_tree_reaches_into_no_class_beyond_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $found = new ReflectionInTestsGuard(new PhpFileInspector(), $root, 'tests')->violations();

        self::assertSame([], new ListedFindings($root . '/tests/Guards/lists/test-reflection.txt')->compare($found, ReflectionInTestsGuard::explain(...)));
    }

    private function inMethod(string $body): string
    {
        return "<?php\n\nuse ReflectionProperty;\n\nfinal class FooTest {\n    public function testWorks(): void {\n" . $body . "\n    }\n}\n";
    }

    /**
     * @return list<string>
     */
    private function findings(string $source): array
    {
        $root = SourceSandbox::create(['tests/Unit/FooTest.php' => $source], '.checkout-');

        try {
            return new ReflectionInTestsGuard(new PhpFileInspector(), $root, 'tests')->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
