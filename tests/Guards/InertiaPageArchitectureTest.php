<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\InertiaPageGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class InertiaPageArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Http\\Controllers;\nuse Inertia\\Inertia;\nfinal class ShowController\n{\n    public function __invoke(string \$page)\n    {\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function pagesNotNamedByText(): iterable
    {
        yield 'a variable' => [self::HEAD . "        return Inertia::render(\$page);\n    }\n}\n", 'an Inertia page that is not named by a string'];
        yield 'a built string' => [self::HEAD . "        return Inertia::render('pages/' . \$page);\n    }\n}\n", 'an Inertia page that is not named by a string'];
        yield 'an interpolated string' => [self::HEAD . "        return Inertia::render(\"editions/{\$page}\");\n    }\n}\n", 'an Inertia page that is not named by a string'];
        yield 'the helper' => [self::HEAD . "        return inertia(\$page);\n    }\n}\n", 'an Inertia page that is not named by a string'];
        yield 'the facade by its full name' => [self::HEAD . ('        return \Inertia' . '\Inertia::render($page);
    }
}
'), 'an Inertia page that is not named by a string'];
        yield 'a page in a route default' => ["<?php\nuse Illuminate\\Support\\Facades\\Route;\nRoute::get('a', \\App\\A::class)->defaults('component', \$page);\n", 'an Inertia page that is not named by a string'];
        yield 'a page without a file' => [self::HEAD . "        return Inertia::render('no/such-page');\n    }\n}\n", 'the Inertia page no/such-page has no file'];
    }

    #[Test]
    #[DataProvider('pagesNotNamedByText')]
    public function it_detects_a_page_that_is_not_named_by_text_or_has_no_file(string $source, string $reason): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
    }

    #[Test]
    public function it_accepts_a_page_named_by_text_that_has_its_file_and_a_render_method_of_another_class(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource(self::HEAD . "        \$this->view->render(\$page);\n        return Inertia::render('home', ['a' => 1]);\n    }\n}\n"));
    }

    #[Test]
    public function it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            'app/Http/Controllers/ShowController.php' => self::HEAD . "        Inertia::render('home');\n        return Inertia::render('away');\n    }\n}\n",
            'resources/js/pages/home.tsx' => 'export default function Home() {}',
        ], '.checkout-');

        try {
            $violations = new InertiaPageGuard(new PhpFileInspector(), $root, ['app', 'routes'], 'resources/js/pages')->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Http/Controllers/ShowController.php:9: the Inertia page away has no file', $violations[0]);
    }

    #[Test]
    public function it_holds_the_real_tree_to_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/inertia-page-names.txt')->differences($this->guard($root)->violations()));
    }

    private function guard(string $root): InertiaPageGuard
    {
        return new InertiaPageGuard(new PhpFileInspector(), $root, ['app', 'routes'], 'resources/js/pages');
    }
}
