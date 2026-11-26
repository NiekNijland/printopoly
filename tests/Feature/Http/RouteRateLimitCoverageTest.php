<?php

declare(strict_types=1);

namespace Tests\Feature\Http;

use Illuminate\Cache\RateLimiter;
use Illuminate\Routing\Route;
use Illuminate\Routing\Router;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\CountedList;
use Tests\Support\Feature\AppRoutes;
use Tests\TestCase;

/**
 * Every route carries one `throttle:<name>`, from the route or its group, where the name is a limiter that the one
 * provider registers (catalog "Rate limit"). A route without one, a throttle by numbers (`throttle:60,1`), a name no
 * limiter has, and two throttles on one route are today's counted list, which step 8 empties.
 */
final class RouteRateLimitCoverageTest extends TestCase
{
    #[Test]
    public function it_holds_every_route_to_one_named_limiter_or_to_its_counted_list(): void
    {
        $routes = $this->routes();
        $problems = [];

        foreach ($routes->all() as $route) {
            $problem = $this->problem($routes, $route);

            if ($problem !== null) {
                $problems[] = AppRoutes::identifier($route) . ': ' . $problem;
            }
        }

        self::assertSame([], new CountedList(base_path('tests/Support/Architecture/lists/route-rate-limits.txt'))->differences($problems));
    }

    #[Test]
    public function it_names_the_problem_of_a_route(): void
    {
        $routes = $this->routes();
        $route = static fn (array $middleware): Route => new Route(['POST'], '_example', static fn (): string => 'ok')->middleware($middleware);

        self::assertSame('has no throttle: give it throttle:<name> of a limiter of the provider', $this->problem($routes, $route(['web'])));
        self::assertSame('throttles by numbers (throttle:60,1): name a limiter of the provider, whose number is in config', $this->problem($routes, $route(['throttle:60,1'])));
        self::assertSame('throttles by a name no limiter has (throttle:nobody)', $this->problem($routes, $route(['throttle:nobody'])));
        self::assertSame('carries more than one throttle (throttle:editions, throttle:editions-create): keep the one of the route', $this->problem($routes, $route(['throttle:editions', 'throttle:editions-create'])));
        self::assertNull($this->problem($routes, $route(['web', 'throttle:editions'])));
    }

    private function problem(AppRoutes $routes, Route $route): ?string
    {
        $throttles = array_values(array_filter($routes->namedMiddleware($route), static fn (string $middleware): bool => str_starts_with($middleware, 'throttle:')));

        if ($throttles === []) {
            return 'has no throttle: give it throttle:<name> of a limiter of the provider';
        }

        if (count($throttles) > 1) {
            return 'carries more than one throttle (' . implode(', ', $throttles) . '): keep the one of the route';
        }

        $name = mb_substr($throttles[0], mb_strlen('throttle:'));

        if (preg_match('/^\d/', $name) === 1) {
            return 'throttles by numbers (' . $throttles[0] . '): name a limiter of the provider, whose number is in config';
        }

        return $this->app->make(RateLimiter::class)->limiter($name) === null ? 'throttles by a name no limiter has (' . $throttles[0] . ')' : null;
    }

    private function routes(): AppRoutes
    {
        return new AppRoutes($this->app->make(Router::class), 'App\\', [base_path('routes'), base_path('bootstrap')]);
    }
}
