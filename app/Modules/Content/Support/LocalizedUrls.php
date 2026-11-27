<?php

declare(strict_types=1);

namespace App\Modules\Content\Support;

use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;

/**
 * The URL of the current page in every interface language. The language
 * switch links to these, and public pages will use them for hreflang (B66).
 */
final class LocalizedUrls
{
    /**
     * @return array<string, string>
     */
    public static function forRequest(Request $request): array
    {
        $route = $request->route();
        $route = $route instanceof Route ? $route : null;

        $urls = [];

        foreach (Locale::cases() as $locale) {
            $urls[$locale->value] = self::localizedRouteUrl($request, $route, $locale)
                ?? route('home', ['locale' => $locale->value]);
        }

        return $urls;
    }

    private static function localizedRouteUrl(Request $request, ?Route $route, Locale $locale): ?string
    {
        if (! $route instanceof Route) {
            return null;
        }

        $page = $route->parameter('page');

        if (is_string($page) && ($publicPage = PublicPage::tryFrom($page)) instanceof PublicPage) {
            $query = $request->getQueryString();
            $url = url($publicPage->path($locale));

            return $query === null ? $url : $url . '?' . $query;
        }

        $name = $route->getName();

        if ($name === null || ! in_array('locale', $route->parameterNames(), true)) {
            return null;
        }

        // Only the URI's own parameters: route defaults are parameters too and
        // would otherwise turn up in the query string.
        $parameters = [];

        foreach ($route->parameterNames() as $parameterName) {
            if (is_string($parameterName)) {
                $parameters[$parameterName] = $route->parameter($parameterName);
            }
        }

        $url = route($name, [...$parameters, 'locale' => $locale->value]);
        $query = $request->getQueryString();

        return $query === null ? $url : $url . '?' . $query;
    }
}
