<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Support\Facades\App;
use App\Modules\Content\Enums\PublicPage;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tells crawlers what to index (B66). Only the public pages are indexable.
 * Everything else that answers (the editor, the editions, the print pages,
 * the JSON endpoints, a 404) gets `X-Robots-Tag: noindex`, which works for
 * every content type, next to the robots meta tag the pages carry.
 */
final class SetSeoHeaders
{
    /** Routes that are not pages but are meant to be fetched by crawlers. */
    private const array CRAWLABLE_ROUTES = ['sitemap', 'security-txt', 'root'];

    /**
     * @param Closure(Request): Response $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $route = $request->route();
        $name = $route instanceof Route ? $route->getName() : null;
        $page = $route instanceof Route ? $route->parameter('page') : null;
        $publicPage = is_string($page) ? PublicPage::tryFrom($page) : null;

        if ($publicPage instanceof PublicPage && $response->isSuccessful()) {
            $response->headers->set('Content-Language', App::getLocale());

            return $response;
        }

        if (! in_array($name, self::CRAWLABLE_ROUTES, true) && ! $response->isRedirection()) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }
}
