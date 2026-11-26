<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\ContainerBindingGuard;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class ContainerBindingArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Providers;\nuse App\\Print\\PdfRenderer;\nuse App\\Print\\ChromePdfRenderer as Chrome;\nuse Spatie\\LaravelPdf\\PdfBuilder;\nfinal class AppServiceProvider\n{\n    public function register(): void\n    {\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function bindingsOfOwnClasses(): iterable
    {
        yield 'bind' => [self::HEAD . "        \$this->app->bind(PdfRenderer::class, Chrome::class);\n    }\n}\n"];
        yield 'singleton' => [self::HEAD . "        \$this->app->singleton(PdfRenderer::class);\n    }\n}\n"];
        yield 'scoped through an alias' => [self::HEAD . "        \$this->app->scoped(Chrome::class);\n    }\n}\n"];
    }

    #[DataProvider('bindingsOfOwnClasses')]
    public function test_it_detects_a_provider_that_binds_a_class_of_the_application(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('in a provider: declare the binding on the class with #[Scoped], #[Singleton] or #[Bind]', $violations[0]);
    }

        public function test_it_accepts_a_binding_of_a_vendor_class(): void
        {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource(self::HEAD . "        \$this->app->singleton(PdfBuilder::class);\n    }\n}\n"));
    }

        public function test_it_reads_a_tree_under_a_dot_directory(): void
        {
        $root = SourceSandbox::create(['app/Providers/AppServiceProvider.php' => self::HEAD . "        \$this->app->bind(PdfRenderer::class);\n    }\n}\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertSame(['app/Providers/AppServiceProvider.php: binds App\Print\PdfRenderer in a provider: declare the binding on the class with #[Scoped], #[Singleton] or #[Bind]'], $violations);
    }

        public function test_it_holds_the_real_tree_to_its_counted_list(): void
        {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/provider-bindings.txt')->differences($this->guard($root)->violations()));
    }

    private function guard(string $root): ContainerBindingGuard
    {
        return new ContainerBindingGuard(new CallInspector(), $root, 'app/Providers', 'App\\');
    }
}
