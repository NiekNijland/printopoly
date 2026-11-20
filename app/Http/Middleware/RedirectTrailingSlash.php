<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * /nl/printgids/ answers 200 in Laravel, which makes two URLs for one page.
 * A permanent redirect to the version without the slash keeps one (B66).
 */
final class RedirectTrailingSlash
{
    /**
     * @param Closure(Request): Response $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->getPathInfo();

        if (! $request->isMethodSafe() || $path === '/' || ! str_ends_with($path, '/')) {
            return $next($request);
        }

        $target = $request->getSchemeAndHttpHost() . $request->getBaseUrl() . rtrim($path, '/');
        $query = $request->getQueryString();

        return new RedirectResponse($query === null ? $target : $target . '?' . $query, Response::HTTP_MOVED_PERMANENTLY);
    }
}
