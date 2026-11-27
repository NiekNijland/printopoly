<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth\Session;

use App\Http\Middleware\HandleInertiaRequests;
use App\Modules\Accounts\Data\SignedOutData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Logging out also clears the copy of the editions in this browser: the menu
 * promises it, and it matters on a shared computer (Staten, accountmenu). The
 * server cannot reach IndexedDB, so it tells the editor to do it: JSON
 * callers get `clearLocalCopy: true`, Inertia and normal requests get the
 * shared prop `clearLocalCopy` on the page they land on.
 */
final readonly class LogoutController
{
    public function __invoke(Request $request): Response|RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $home = route('home', ['locale' => App::getLocale()]);

        if ($request->expectsJson() && ! $request->headers->has('X-Inertia')) {
            return new SignedOutData(clearLocalCopy: true, redirect: $home)->toResponse($request)->setStatusCode(Response::HTTP_OK);
        }

        $request->session()->put(HandleInertiaRequests::CLEAR_LOCAL_COPY, true);

        return redirect()->to($home);
    }
}
