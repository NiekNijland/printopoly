<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth\Google;

use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

final readonly class RedirectController
{
    public function __invoke(Request $request): RedirectResponse
    {
        $previous = url()->previous();

        if (str_starts_with($previous, url('/')) && ! str_contains($previous, '/auth/google')) {
            $request->session()->put('url.intended', $previous);
        }

        // Google's default scopes are exactly openid, profile and email (B68).
        return Socialite::driver('google')->redirect();
    }
}
