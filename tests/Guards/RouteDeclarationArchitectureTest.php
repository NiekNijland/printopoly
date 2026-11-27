<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\RouteParameterGuard;
use Tests\Support\SourceSandbox;

final class RouteDeclarationArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nuse Illuminate\\Support\\Facades\\Route;\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function routesOfAnotherForm(): iterable
    {
        yield 'a snake_case parameter' => [self::HEAD . "Route::get('boxes/{box_id}', \\App\\A::class);\n", 'the route parameter {box_id} is not camelCase: name it {boxId}'];
        yield 'a kebab-case parameter' => [self::HEAD . "Route::get('boxes/{box-id}', \\App\\A::class);\n", 'name it {boxId}'];
        yield 'an optional snake_case parameter' => [self::HEAD . "Route::get('boxes/{box_id?}', \\App\\A::class);\n", 'the route parameter {box_id}'];
        yield 'a parameter with a binding field' => [self::HEAD . "Route::get('boxes/{Box:token}', \\App\\A::class);\n", 'the route parameter {Box}'];
        yield 'a parameter in an interpolated string' => [self::HEAD . "Route::get(\"{\$prefix}/{box_id}\", \\App\\A::class);\n", 'the route parameter {box_id}'];
        yield 'a closure' => [self::HEAD . "Route::get('a', function () { return 1; });\n", 'a route whose action is a closure'];
        yield 'an arrow function on the fallback' => [self::HEAD . "Route::fallback(static fn (): never => abort(404));\n", 'a route whose action is a closure'];
        yield 'a closure through a chain' => [self::HEAD . "Route::middleware('auth')->post('a', fn () => 1);\n", 'a route whose action is a closure'];
        yield 'a closure through the router' => ["<?php\n\$router->get('a', fn () => 1);\n", 'a route whose action is a closure'];
        yield 'a closure in a uses array' => [self::HEAD . "Route::get('a', ['uses' => fn () => 1]);\n", 'a route whose action is a closure'];
        yield 'the facade by its global alias' => ["<?php\n\\Route::get('a', fn () => 1);\n", 'a route whose action is a closure'];
    }

    #[DataProvider('routesOfAnotherForm')]
    public function test_it_detects_a_route_parameter_or_action_of_another_form(string $source, string $reason): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'camelCase parameters and a controller' => [self::HEAD . "Route::get('boxes/{boxId}/contributions/{contributionId}', \\App\\A::class);\n"];
        yield 'a group closure' => [self::HEAD . "Route::prefix('api')->group(function (): void { Route::get('a', \\App\\A::class); });\n"];
        yield 'a closure of a where callback' => [self::HEAD . "Route::get('a/{edition}', \\App\\A::class)->where('edition', '[a-z]{8,64}');\n"];
        yield 'braces in a message' => ["<?php\n\$a = 'a {count} b';\n"];
    }

    #[DataProvider('nearMisses')]
    public function test_it_accepts_camel_case_parameters_controllers_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

    public function test_it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['routes/web.php' => self::HEAD . "Route::get('a', fn () => 1);\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('routes/web.php:3: a route whose action is a closure', $violations[0]);
    }

    public function test_it_holds_the_real_tree_to_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], $this->guard($root)->violations());
    }

    private function guard(string $root): RouteParameterGuard
    {
        return new RouteParameterGuard(new CallInspector(), $root, 'routes');
    }
}
