<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth\GoogleCallback;

use App\Modules\Accounts\Actions\LoginWithGoogle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

final readonly class HandleController
{
    public function __invoke(Request $request, LoginWithGoogle $loginWithGoogle): RedirectResponse
    {
        $home = route('home', ['locale' => App::getLocale()]);

        // A cancelled consent screen, an expired state or a Google outage all
        // land here. Say so instead of failing silently.
        try {
            $googleUser = Socialite::driver('google')->user();
            $loginWithGoogle->handle($googleUser, App::getLocale());
        } catch (Throwable $throwable) {
            report($throwable);
            Inertia::flash('error', __('auth.google_failed'));

            return redirect()->to($home);
        }

        $request->session()->regenerate();

        return redirect()->intended($home);
    }
}
