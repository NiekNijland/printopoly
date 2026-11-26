<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\LoginWithGoogle;
use App\Http\Controllers\Controller;
use App\Integrations\Google\GoogleLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

final class HandleGoogleCallbackController extends Controller
{
    public function __invoke(Request $request, LoginWithGoogle $loginWithGoogle): RedirectResponse
    {
        abort_unless(GoogleLogin::isConfigured(), 404);

        $home = route('home', ['locale' => app()->getLocale()]);

        // A cancelled consent screen, an expired state or a Google outage all
        // land here. Say so instead of failing silently.
        try {
            $googleUser = Socialite::driver('google')->user();
            $loginWithGoogle->handle($googleUser, app()->getLocale());
        } catch (Throwable $throwable) {
            report($throwable);
            Inertia::flash('error', __('auth.google_failed'));

            return redirect()->to($home);
        }

        $request->session()->regenerate();

        return redirect()->intended($home);
    }
}
