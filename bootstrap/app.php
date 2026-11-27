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
    })
    ->create();
