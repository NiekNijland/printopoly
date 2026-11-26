<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\ClosedClassGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class ClosedClassArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{array<string, string>, list<string>, string}>
     */
    public static function classesThatBreakTheRule(): iterable
    {
        yield 'a concrete parent' => [['app/A.php' => 'class Base {} final class Child extends Base {}'], ['extended-concrete App\\Base'], 'make the parent `abstract`'];
        yield 'a concrete parent in another file under an alias' => [['app/A.php' => 'class Base {}', 'app/B.php' => 'use App\\Base as Parent_; final class Child extends Parent_ {}'], ['extended-concrete App\\Base'], 'fold the children into the parent'];
        yield 'a concrete parent of an anonymous class' => [['app/A.php' => 'class Base {} $x = new class() extends Base {};'], ['extended-concrete App\\Base'], 'move what only one child uses'];
        yield 'a final concrete parent' => [['app/A.php' => 'final class Base {} final class Child extends Base {}'], ['extended-concrete App\\Base'], 'is concrete and another class extends it'];
        yield 'a tag on a final class' => [['app/A.php' => "/**\n * @final\n */\nfinal class Kept {}"], ['stale-open App\\Kept'], 'delete the tag'];
        yield 'a tag on an abstract class' => [['app/A.php' => "/** @final */\nabstract class Kept {}"], ['stale-open App\\Kept'], 'is final or abstract'];
        yield 'a tag on a final readonly class' => [['app/A.php' => "/** @final */\nfinal readonly class Kept {}"], ['stale-open App\\Kept'], 'carries the docblock tag `@final`'];
    }

    /**
     * @param array<string, string> $files
     * @param list<string> $findings
     */
    #[Test]
    #[DataProvider('classesThatBreakTheRule')]
    public function it_detects_a_concrete_parent_and_a_stale_final_tag(array $files, array $findings, string $words): void
    {
        [$found, $explained] = $this->classesOf($files);

        self::assertSame($findings, $found);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function classesThatPass(): iterable
    {
        yield 'an abstract parent' => [['app/A.php' => 'abstract class Base {} final class Child extends Base {}']];
        yield 'a vendor parent' => [['app/A.php' => 'final class Gateway extends \\Illuminate\\Support\\Fluent {}']];
        yield 'an open class with the tag, which the dashboard row counts' => [['app/A.php' => "/**\n * @final\n */\nclass Kept {}"]];
        yield 'an open class without the tag, which the dashboard row counts' => [['app/A.php' => 'class Open {}']];
        yield 'a tag that only starts like the marker' => [['app/A.php' => "/** @finally */\nfinal class Kept {}"]];
    }

    /**
     * @param array<string, string> $files
     */
    #[Test]
    #[DataProvider('classesThatPass')]
    public function it_accepts_an_abstract_parent_a_vendor_parent_and_a_tag_on_an_open_class(array $files): void
    {
        self::assertSame([], $this->classesOf($files)[0]);
    }

    #[Test]
    public function it_reads_a_tree_under_a_dot_directory(): void
    {
        self::assertSame(['extended-concrete App\\Base'], $this->classesOf(['app/A.php' => 'class Base {}', 'app/B.php' => 'final class Child extends Base {}'], '.checkout-')[0]);
    }

    #[Test]
    public function it_extends_no_concrete_class_and_keeps_no_stale_final_tag_in_app(): void
    {
        $guard = new ClosedClassGuard(new PhpFileInspector(), $this->root(), 'app');
        $findings = $guard->findings();

        self::assertSame([], $findings, implode("\n", $guard->explain($findings)));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function classesOf(array $files, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create(array_map(static fn (string $source): string => "<?php\nnamespace App;\n" . $source . "\n", $files), $prefix);

        try {
            $guard = new ClosedClassGuard(new PhpFileInspector(), $root, 'app');
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
