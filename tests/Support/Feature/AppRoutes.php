<?php

declare(strict_types=1);

namespace Tests\Support\Feature;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Routing\Route;
use Illuminate\Routing\Router;
use ReflectionFunction;
use ReflectionNamedType;
use ReflectionParameter;

/**
 * The routes of the application as the booted router holds them, for the coverage tests over the route list
 * (04-guards.md C1): a route whose action is a controller of the application, or a closure written in the application's
 * own route or bootstrap files. Vendor routes (Horizon, the health check, broadcasting) are the vendor's.
 */
final readonly class AppRoutes
{
    /**
     * @param list<string> $ownFolders absolute folders whose closures count as the application's
     */
    public function __construct(
        private Router $router,
        private string $namespace,
        private array $ownFolders,
    ) {
    }

    /**
     * @return list<Route>
     */
    public function all(): array
    {
        return array_values(array_filter($this->router->getRoutes()->getRoutes(), $this->isOwn(...)));
    }

    public static function identifier(Route $route): string
    {
        return implode('|', array_diff($route->methods(), ['HEAD'])) . ' ' . $route->uri();
    }

    /**
     * @return list<string> the middleware the route names itself or through a middleware group, unexpanded (`throttle:x`, `can:y`)
     */
    public function namedMiddleware(Route $route): array
    {
        $names = [];

        foreach ($route->gatherMiddleware() as $middleware) {
            if (! is_string($middleware)) {
                continue;
            }

            $group = $this->router->getMiddlewareGroups()[$middleware] ?? null;

            foreach (is_array($group) ? $group : [$middleware] as $name) {
                if (is_string($name)) {
                    $names[] = $name;
                }
            }
        }

        return $names;
    }

    /**
     * @return array<string, class-string<Model>|null> every route parameter, with the model the controller binds it to (null: not a model)
     */
    public static function parameters(Route $route): array
    {
        $types = [];

        foreach (self::signature($route) as $parameter) {
            $type = $parameter->getType();
            $types[$parameter->getName()] = $type instanceof ReflectionNamedType && is_subclass_of($type->getName(), Model::class) ? $type->getName() : null;
        }

        $parameters = [];

        foreach ($route->parameterNames() as $name) {
            if (is_string($name)) {
                $parameters[$name] = $types[$name] ?? null;
            }
        }

        return $parameters;
    }

    /**
     * @return list<ReflectionParameter> the parameters of the route's action
     */
    public static function signature(Route $route): array
    {
        return array_values(array_filter($route->signatureParameters(), static fn (mixed $parameter): bool => $parameter instanceof ReflectionParameter));
    }

    private function isOwn(Route $route): bool
    {
        $action = $route->getAction('uses');

        if (is_string($action)) {
            return str_starts_with(ltrim($action, '\\'), $this->namespace);
        }

        if (! $action instanceof Closure) {
            return false;
        }

        $file = (string) new ReflectionFunction($action)->getFileName();

        return array_any($this->ownFolders, static fn (string $folder): bool => str_starts_with($file, $folder . '/'));
    }
}
