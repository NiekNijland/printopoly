<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\GoogleLogin;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

final class RedirectToGoogleController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        abort_unless(GoogleLogin::isConfigured(), 404);

        $previous = url()->previous();

        if (str_starts_with($previous, url('/')) && ! str_contains($previous, '/auth/google')) {
            $request->session()->put('url.intended', $previous);
        }

        // Google's default scopes are exactly openid, profile and email (B68).
        return Socialite::driver('google')->redirect();
    }
}
