<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectTrailingSlash;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\SetSecurityHeaders;
use App\Http\Middleware\SetSeoHeaders;
use App\Http\Middleware\TrackActivity;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Routing\Route;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        // One URL per page (B66): /nl/vragen/ redirects to /nl/vragen, and every response carries the security headers.
        $middleware->prepend(RedirectTrailingSlash::class);
        $middleware->append(SetSecurityHeaders::class);
        // The root picks the language; SetLocale has not run yet at this point.
        $middleware->redirectGuestsTo(static fn (): string => route('root'));

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

            return Inertia::render('error', ['status' => $status])->toResponse($request)->setStatusCode($status);
        });
    })
    ->create();
