<?php

declare(strict_types=1);

namespace Tests\Feature\Http;

use Illuminate\Routing\Route;
use Illuminate\Routing\Router;
use Tests\Support\Feature\AppRoutes;
use Tests\TestCase;

/**
 * Every route behind the sign-in carries its check on the route itself: `can:` with a permission, or `can:` with a policy
 * ability and the route parameter (catalog "Authorization"). The routes without one are today's counted list, which
 * step 8 empties. Routes for anybody (public pages, capability links) are not behind the sign-in and not in scope here.
 */
final class RoutePermissionCoverageTest extends TestCase
{
    public function test_it_holds_every_route_behind_the_sign_in_to_a_check_on_the_route_or_to_its_counted_list(): void
    {
        $routes = $this->routes();
        $uncovered = [];

        foreach ($routes->all() as $route) {
            if ($this->inScope($routes, $route) && ! $this->authorized($routes, $route)) {
                $uncovered[] = AppRoutes::identifier($route) . ': a route behind the sign-in without can: on the route';
            }
        }

        self::assertSame([], $uncovered);
    }

    public function test_it_counts_the_sign_in_and_the_check_from_the_route_and_its_groups(): void
    {
        $routes = $this->routes();
        $route = static fn (array $middleware): Route => new Route(['POST'], '_example', static fn (): string => 'ok')->middleware($middleware);

        self::assertFalse($this->inScope($routes, $route(['web'])));
        self::assertFalse($this->inScope($routes, $route(['web', 'guest'])));
        self::assertTrue($this->inScope($routes, $route(['web', 'auth'])));
        self::assertTrue($this->inScope($routes, $route(['auth:web'])));
        self::assertFalse($this->authorized($routes, $route(['auth'])));
        self::assertTrue($this->authorized($routes, $route(['auth', 'can:update,edition'])));
        self::assertFalse($this->authorized($routes, $route(['auth', 'can:update,edition'])->withoutMiddleware('can:update,edition')));
    }

    private function inScope(AppRoutes $routes, Route $route): bool
    {
        return array_any($routes->namedMiddleware($route), static fn (string $middleware): bool => $middleware === 'auth' || str_starts_with($middleware, 'auth:'));
    }

    private function authorized(AppRoutes $routes, Route $route): bool
    {
        $removed = $route->excludedMiddleware();

        return array_any($routes->namedMiddleware($route), static fn (string $middleware): bool => str_starts_with($middleware, 'can:') && ! in_array($middleware, $removed, true));
    }

    private function routes(): AppRoutes
    {
        return new AppRoutes($this->app->make(Router::class), 'App\\', [base_path('routes'), base_path('bootstrap')]);
    }
}
