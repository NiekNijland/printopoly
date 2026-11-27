<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectTrailingSlash;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\SetSecurityHeaders;
use App\Http\Middleware\SetSeoHeaders;
use App\Http\Middleware\TokenCapability;
use App\Http\Middleware\TrackActivity;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Routing\Route;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

$moduleCommands = glob(__DIR__ . '/../app/Modules/*/Commands', GLOB_ONLYDIR);

return Application::configure(basePath: dirname(__DIR__))
    ->withCommands($moduleCommands === false ? [] : $moduleCommands)
    ->withEvents(discover: [__DIR__ . '/../app/Modules/*/Listeners'])
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
        then: static function (): void {
            require __DIR__ . '/../routes/count.php';
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->alias(['capability' => TokenCapability::class]);
        // One URL per page (B66): /nl/vragen/ redirects to /nl/vragen, and every response carries the security headers.
        $middleware->prepend(RedirectTrailingSlash::class);
        $middleware->append(SetSecurityHeaders::class);
        // The root picks the language; SetLocale has not run yet at this point.
        $middleware->redirectGuestsTo(static fn (): string => route('root'));
        // An empty string in an edition means something: a card whose text was cleared (B194), a hidden subtitle.
        // Turned into null it would fall away and the standard text would come back.
        $middleware->convertEmptyStringsToNull(except: [
            static fn (Request $request): bool => $request->is('api/editions', 'api/editions/*'),
        ]);

        // SetLocale must run before route bindings and before Inertia shares
        // its props, so both see the resolved language.
        $middleware->prependToPriorityList(
            before: SubstituteBindings::class,
            prepend: SetLocale::class,
        );
        $middleware->appendToPriorityList(
            after: SetLocale::class,
            append: HandleInertiaRequests::class,
        );

        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            SetSeoHeaders::class,
            TrackActivity::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash([
            'code',
            'state',
        ]);

        $exceptions->shouldRenderJsonWhen(
            static fn (Request $request): bool => $request->expectsJson(),
        );

        // A page of our own for 403, 404, 419, 500 and 503, with the right status (B66).
        // The 404 of an unknown URL arrives through the fallback route in routes/web.php,
        // so the language and the shared props are there.
        $exceptions->respond(static function (Response $response, Throwable $exception, Request $request): Response {
            $status = $response->getStatusCode();

            if (
                ! in_array($status, [403, 404, 419, 500, 503], true)
                || $request->expectsJson()
                || ! $request->route() instanceof Route
            ) {
                return $response;
            }

            // A 404 from a route binding (an expired print link) comes before HandleInertiaRequests ran, so the page
            // would miss the shared props the header and footer read (bug 43 of test round 3). Share them here.
            Inertia::share(resolve(HandleInertiaRequests::class)->share($request));

            return Inertia::render('error', ['status' => $status])->toResponse($request)->setStatusCode($status);
        });
    })
    ->create();
