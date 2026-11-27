<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\RedirectGuard;
use Tests\Support\SourceSandbox;

final class RedirectArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Http\\Controllers;\nfinal class StoreController\n{\n    public function __invoke()\n    {\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function redirectsThroughRedirect(): iterable
    {
        yield 'redirect()->route()' => [self::HEAD . "        return redirect()->route('home');\n    }\n}\n"];
        yield 'redirect()->back()' => [self::HEAD . "        return redirect()->back();\n    }\n}\n"];
        yield 'the facade' => [self::HEAD . ('        return \Illuminate' . '\Support\Facades\Redirect::route(\'home\');
    }
}
')];
        yield 'the facade by its global alias' => [self::HEAD . "        return \\Redirect::back();\n    }\n}\n"];
        yield 'redirect(route())' => [self::HEAD . "        return redirect(route('home'));\n    }\n}\n"];
        yield 'redirect()->to(route())' => [self::HEAD . "        return redirect()->to(route('home', ['locale' => 'nl']));\n    }\n}\n"];
    }

    #[DataProvider('redirectsThroughRedirect')]
    public function test_it_detects_a_redirect_through_redirect(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString("a redirect through redirect(): write to_route('name') for a named route and back() to go back", $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'to_route()' => [self::HEAD . "        return to_route('home');\n    }\n}\n"];
        yield 'back()' => [self::HEAD . "        return back();\n    }\n}\n"];
        yield 'an external address' => [self::HEAD . "        return redirect()->away('https://example.test');\n    }\n}\n"];
        yield 'a route() method of another object' => [self::HEAD . "        return \$this->router->route('home');\n    }\n}\n"];
    }

    #[DataProvider('nearMisses')]
    public function test_it_accepts_to_route_back_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

    public function test_it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            'app/Http/Controllers/StoreController.php' => self::HEAD . "        return redirect()->back();\n    }\n}\n",
            'routes/web.php' => "<?php\n",
        ], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Http/Controllers/StoreController.php: line 7:', $violations[0]);
    }

    public function test_it_finds_no_redirect_through_redirect_in_the_real_tree(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    private function guard(string $root): RedirectGuard
    {
        return new RedirectGuard(new CallInspector(), $root, ['app', 'routes']);
    }
}
