<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\TrackActivity;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
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
    })
    ->create();
