<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The bare domain sends you to the home page in your browser's language (B46).
 */
final class RedirectToLocaleController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        return redirect()->route('home', [
            ...$request->query(),
            'locale' => app()->getLocale(),
        ], 302)->header('Vary', 'Accept-Language');
    }
}
