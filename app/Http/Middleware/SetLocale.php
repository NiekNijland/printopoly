<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Modules\Content\Enums\Locale;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the interface language for every request.
 *
 * Priority: the {locale} route segment, then the account's language, then the
 * language this session last browsed in, then Accept-Language, then Dutch.
 * The bare domain ignores the session so the root redirect always follows the
 * browser (B46), the way motormonitor does it.
 */
final class SetLocale
{
    private const string SESSION_KEY = 'locale';

    /**
     * @param Closure(Request): Response $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolve($request);

        App::setLocale($locale->value);
        URL::defaults(['locale' => $locale->value]);

        if ($this->routeLocale($request) instanceof Locale && $request->hasSession()) {
            $request->session()->put(self::SESSION_KEY, $locale->value);
        }

        return $next($request);
    }

    private function resolve(Request $request): Locale
    {
        return $this->routeLocale($request)
            ?? $this->userLocale($request)
            ?? $this->sessionLocale($request)
            ?? Locale::fromPreferredLanguages($request->getLanguages())
            ?? Locale::default();
    }

    private function routeLocale(Request $request): ?Locale
    {
        $value = $request->route('locale');

        // The fallback route has no {locale}: /nl/does-not-exist is still Dutch.
        if (! is_string($value) && $request->route()?->isFallback === true) {
            $value = $request->segment(1);
        }

        return is_string($value) ? Locale::tryFrom($value) : null;
    }

    private function userLocale(Request $request): ?Locale
    {
        $user = $request->user();

        if (! $user instanceof User || $user->locale === null) {
            return null;
        }

        return Locale::tryFrom($user->locale);
    }

    private function sessionLocale(Request $request): ?Locale
    {
        if ($request->is('/') || ! $request->hasSession()) {
            return null;
        }

        $value = $request->session()->get(self::SESSION_KEY);

        return is_string($value) ? Locale::tryFrom($value) : null;
    }
}
