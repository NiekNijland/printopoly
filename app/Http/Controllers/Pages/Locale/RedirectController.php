<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\Locale;

use App\Http\Requests\Pages\RedirectLocaleRequest;
use Illuminate\Http\RedirectResponse;

/**
 * The bare domain sends you to the home page in your browser's language (B46).
 */
final readonly class RedirectController
{
    public function __invoke(RedirectLocaleRequest $request): RedirectResponse
    {
        return to_route('home', [
            ...$request->forwardedQuery(),
            'locale' => app()->getLocale(),
        ], 302)->header('Vary', 'Accept-Language');
    }
}
