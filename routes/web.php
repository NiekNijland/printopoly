<?php

declare(strict_types=1);

use App\Enums\Locale;
use App\Http\Controllers\Auth\HandleGoogleCallbackController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RedirectToGoogleController;
use App\Http\Controllers\RedirectToLocaleController;
use App\Http\Controllers\ShowEditorController;
use App\Http\Controllers\ShowHomeController;
use App\Http\Controllers\ShowPlaceholderController;
use Illuminate\Support\Facades\Route;

Route::get('/', RedirectToLocaleController::class)->name('root');

Route::prefix('{locale}')
    ->whereIn('locale', Locale::values())
    ->group(function (): void {
        Route::get('/', ShowHomeController::class)->name('home');
        Route::get('editor', ShowEditorController::class)->name('editor');

        // Placeholders so the header and footer link somewhere real. Each one
        // is replaced by its own controller when the page is built (B67, B79).
        $placeholders = [
            'editions' => ['editions.index', 'nav.my_editions'],
            'print-guide' => ['print-guide', 'nav.print_guide'],
            'privacy' => ['privacy', 'footer.privacy'],
            'terms' => ['terms', 'footer.terms'],
            'contact' => ['contact', 'footer.contact'],
        ];

        foreach ($placeholders as $uri => [$name, $titleKey]) {
            Route::get($uri, ShowPlaceholderController::class)
                ->defaults('titleKey', $titleKey)
                ->name($name);
        }
    });

// Logging in is optional (B78). The routes answer 404 until Google
// credentials are configured.
Route::middleware(['guest', 'throttle:20,1'])->group(function (): void {
    Route::get('auth/google/redirect', RedirectToGoogleController::class)->name('auth.google.redirect');
    Route::get('auth/google/callback', HandleGoogleCallbackController::class)->name('auth.google.callback');
});

Route::post('logout', LogoutController::class)
    ->middleware('auth')
    ->name('logout');
