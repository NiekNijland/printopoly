<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\SingleUseTraitGuard;
use Tests\Support\SourceSandbox;

final class NoSingleUseTraitsArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{list<string>, string}>
     */
    public static function traitsWithExactlyOneUser(): iterable
    {
        yield 'one class uses it' => [["<?php\nnamespace App\\Support;\ntrait Lonely {}\n", "<?php\nnamespace App\\One;\nuse App\\Support\\Lonely;\nfinal class A { use Lonely; }\n"], 'App\\Support\\Lonely'];
        yield 'a class that uses it twice counts once' => [["<?php\nnamespace App;\ntrait T {}\nfinal class A { use T; use T; }\n"], 'App\\T'];
        yield 'a trait that only another trait uses' => [["<?php\nnamespace App;\ntrait Inner {}\ntrait Outer { use Inner; }\n"], 'App\\Inner'];
        yield 'one enum uses it' => [["<?php\nnamespace App;\ntrait HasLabel {}\nenum Status: string { use HasLabel; case A = 'a'; }\n"], 'App\\HasLabel'];
        yield 'the trait written fully qualified' => [["<?php\nnamespace App\\Support;\ntrait Lonely {}\n", "<?php\nnamespace App\\Two;\nfinal class B { use \\App\\Support\\Lonely; }\n"], 'App\\Support\\Lonely'];
        yield 'the trait under an alias' => [["<?php\nnamespace App\\Support;\ntrait Lonely {}\n", "<?php\nnamespace App\\Two;\nuse App\\Support\\Lonely as Alone;\nfinal class B { use Alone; }\n"], 'App\\Support\\Lonely'];
        yield 'the trait in a group import' => [["<?php\nnamespace App\\Support;\ntrait Lonely {}\n", "<?php\nnamespace App\\Two;\nuse App\\Support\\{Lonely};\nfinal class B { use Lonely; }\n"], 'App\\Support\\Lonely'];
        yield 'a test class uses it' => [["<?php\nnamespace Tests\\Concerns;\ntrait MakesBoxes {}\n", "<?php\nnamespace Tests\\Feature;\nuse Tests\\Concerns\\MakesBoxes;\nfinal class BoxTest { use MakesBoxes; }\n"], 'Tests\\Concerns\\MakesBoxes'];
    }

    /**
     * @param list<string> $sources
     */
    #[Test]
    #[DataProvider('traitsWithExactlyOneUser')]
    public function it_detects_a_trait_that_exactly_one_class_uses(array $sources, string $trait): void
    {
        $violations = new SingleUseTraitGuard(new PhpFileInspector(), $this->root(), ['app'])->inSources($sources);

        self::assertCount(1, $violations);
        self::assertStringStartsWith($trait . ': a trait used by exactly one class', $violations[0]);
        self::assertStringContainsString('Move its members into that class', $violations[0]);
    }

    /**
     * @return iterable<string, array{list<string>}>
     */
    public static function traitsThatAreSharedOrUnused(): iterable
    {
        yield 'two classes share it' => [["<?php\nnamespace App\\Support;\ntrait Shared {}\n", "<?php\nnamespace App\\One;\nuse App\\Support\\Shared;\nfinal class A { use Shared; }\n", "<?php\nnamespace App\\Two;\nfinal class B { use \\App\\Support\\Shared; }\n"]];
        yield 'a trait nobody uses is dead code for another check' => [["<?php\nnamespace App;\ntrait Unused {}\n"]];
        yield 'two anonymous classes' => [["<?php\nnamespace App;\ntrait T {}\n\$x = new class() { use T; };\n\$y = new class() { use T; };\n"]];
        yield 'a class and a trait use it' => [["<?php\nnamespace App;\ntrait T {}\ntrait Outer { use T; }\nfinal class A { use T; }\n"]];
        yield 'a trait of a vendor used once' => [["<?php\nnamespace App;\nfinal class A { use \\Illuminate\\Support\\Traits\\Macroable; }\n"]];
    }

    /**
     * @param list<string> $sources
     */
    #[Test]
    #[DataProvider('traitsThatAreSharedOrUnused')]
    public function it_accepts_a_shared_trait_a_trait_nobody_uses_and_a_vendor_trait(array $sources): void
    {
        self::assertSame([], new SingleUseTraitGuard(new PhpFileInspector(), $this->root(), ['app'])->inSources($sources));
    }

    #[Test]
    public function it_counts_the_distinct_users_of_each_trait(): void
    {
        $sources = [
            "<?php\nnamespace App\\Support;\ntrait Shared {}\ntrait Lonely {}\ntrait Unused {}\n",
            "<?php\nnamespace App\\One;\nuse App\\Support\\Shared;\nuse App\\Support\\Lonely;\nfinal class A { use Shared; use Lonely; }\n",
            "<?php\nnamespace App\\Two;\nfinal class B { use \\App\\Support\\Shared; }\n",
        ];

        self::assertSame(['App\\Support\\Lonely' => 1, 'App\\Support\\Shared' => 2, 'App\\Support\\Unused' => 0], new SingleUseTraitGuard(new PhpFileInspector(), $this->root(), ['app'])->traitUsers($sources));
    }

    #[Test]
    public function it_reads_every_folder_of_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            'app/Support/Lonely.php' => "<?php\nnamespace App\\Support;\ntrait Lonely {}\n",
            'tests/Feature/ATest.php' => "<?php\nnamespace Tests\\Feature;\nuse App\\Support\\Lonely;\nfinal class ATest { use Lonely; }\n",
        ], prefix: '.checkout-');

        try {
            $violations = new SingleUseTraitGuard(new PhpFileInspector(), $root, ['app', 'tests'])->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('App\\Support\\Lonely: a trait used by exactly one class', $violations[0]);
    }

    #[Test]
    public function it_lets_no_trait_of_app_or_tests_be_used_by_exactly_one_class(): void
    {
        self::assertSame([], new SingleUseTraitGuard(new PhpFileInspector(), $this->root(), ['app', 'tests'])->violations());
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
