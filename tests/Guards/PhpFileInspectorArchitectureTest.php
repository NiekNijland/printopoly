<?php

declare(strict_types=1);

namespace Tests\Guards;

use InvalidArgumentException;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Name;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\Support\Architecture\DeclarationInspector;
use Tests\Support\Architecture\MemberNodes;
use Tests\Support\SourceSandbox;

final class PhpFileInspectorArchitectureTest extends TestCase
{
    public function test_lists_the_php_files_below_a_directory_in_a_stable_order_and_nothing_else(): void
    {
        $root = SourceSandbox::create(['b.php' => '<?php', 'a/c.php' => '<?php', 'a/readme.md' => 'text', 'a/d.txt' => 'text']);

        try {
            $files = array_map(static fn (string $file): string => mb_substr($file, mb_strlen($root) + 1), new DeclarationInspector()->phpFiles($root));

            self::assertSame(['a/c.php', 'b.php'], $files);
            self::assertSame([], new DeclarationInspector()->phpFiles($root . '/missing', mayBeAbsent: true));
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_fails_on_a_missing_directory_so_a_guard_over_a_renamed_folder_cannot_pass(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('does not exist');

        new DeclarationInspector()->phpFiles('/no/such/folder');
    }

    public function test_fails_on_a_missing_file_so_a_guard_over_a_renamed_file_cannot_pass(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('does not exist');

        new DeclarationInspector()->statements('/no/such/file.php');
    }

    public function test_reads_the_names_and_the_declarations_of_a_file(): void
    {
        $source = "<?php\nnamespace App\\X;\nuse App\\Y\\{Bar, Baz as Qux};\nfinal class Foo extends Bar implements \\Countable {\n    public function count(): int { \$c = new class() {}; return Qux::ONE; }\n}\ntrait T {}\n";
        $root = SourceSandbox::create(['Foo.php' => $source]);

        try {
            $inspector = new DeclarationInspector();
            $names = $inspector->referencedNames($root . '/Foo.php');

            self::assertContains('App\Y\Bar', $names);
            self::assertContains('App\Y\Baz', $names);
            self::assertContains('Countable', $names);
            self::assertSame(['App\X\Foo', 'App\X\T'], array_keys($inspector->declaredTypes($root . '/Foo.php')));
            self::assertCount(2, $inspector->declarations($root . '/Foo.php'));
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_names_the_member_every_node_stands_in(): void
    {
        $source = "<?php\nfirst();\nfunction helper(): void { second(); }\nfinal class Foo {\n    public function run(): void { third(); \$x = new class() { public function inner(): void { fourth(); } }; }\n}\n";
        $root = SourceSandbox::create(['Foo.php' => $source]);

        try {
            $sites = MemberNodes::of(new DeclarationInspector()->statements($root . '/Foo.php'), FuncCall::class);
            $members = array_map(static fn (array $site): string => $site['member'] . ' ' . ($site['node']->name instanceof Name ? $site['node']->name->toString() : ''), $sites);

            self::assertSame(['- first', 'helper() second', 'Foo::run third', 'class@anonymous::inner fourth'], $members);
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
