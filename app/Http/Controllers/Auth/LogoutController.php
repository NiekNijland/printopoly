<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Logging out also clears the copy of the editions in this browser: the menu
 * promises it, and it matters on a shared computer (Staten, accountmenu). The
 * server cannot reach IndexedDB, so it tells the editor to do it: JSON
 * callers get `clearLocalCopy: true`, Inertia and normal requests get the
 * flash prop `clearLocalCopy` on the page they land on.
 */
final class LogoutController extends Controller
{
    public function __invoke(Request $request): JsonResponse|RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $home = route('home', ['locale' => app()->getLocale()]);

        if ($request->expectsJson() && ! $request->headers->has('X-Inertia')) {
            return response()->json(['clearLocalCopy' => true, 'redirect' => $home]);
        }

        Inertia::flash('clearLocalCopy', true);

        return redirect()->to($home);
    }
}
