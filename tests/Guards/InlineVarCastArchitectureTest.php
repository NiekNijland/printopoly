<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\InlineVarCastGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class InlineVarCastArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string}>
     */
    public static function inlineCasts(): iterable
    {
        yield 'on an assignment' => ["<?php\nfinal class A { public function b(mixed \$c): void {\n/** @var list<string> \$d */\n\$d = \$c;\n} }\n"];
        yield 'on a return' => ["<?php\nfunction a(mixed \$b): int {\n/** @var int \$b */\nreturn \$b;\n}\n"];
        yield 'in a closure' => ["<?php\n\$a = function (mixed \$b): void {\n/** @var string \$b */\necho \$b;\n};\n"];
        yield 'on a loop' => ["<?php\nfunction a(array \$b): void {\n/** @var string \$c */\nforeach (\$b as \$c) {}\n}\n"];
    }

    #[Test]
    #[DataProvider('inlineCasts')]
    public function it_detects_an_inline_var_that_narrows_a_type(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('an inline @var narrows a type the analyser never checks', $violations[0]);
    }

    #[Test]
    public function it_accepts_var_on_a_property_and_a_constant(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource("<?php\nfinal class A {\n/** @var list<string> */\nprivate array \$b = [];\n/** @var int */\nprivate const C = 1;\n}\n"));
    }

    #[Test]
    public function it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['app/A.php' => "<?php\nfunction a(mixed \$b): int {\n/** @var int \$b */\nreturn \$b;\n}\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/A.php:3: an inline @var', $violations[0]);
    }

    #[Test]
    public function it_holds_the_real_tree_to_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/inline-var-casts.txt')->differences($this->guard($root)->violations()));
    }

    private function guard(string $root): InlineVarCastGuard
    {
        return new InlineVarCastGuard(new PhpFileInspector(), $root, ['app']);
    }
}
