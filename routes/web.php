<?php

declare(strict_types=1);

use App\Enums\Locale;
use App\Enums\PublicPage;
use App\Http\Controllers\Auth\HandleGoogleCallbackController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RedirectToGoogleController;
use App\Http\Controllers\RedirectToLocaleController;
use App\Http\Controllers\Seo\ShowRobotsController;
use App\Http\Controllers\Seo\ShowSecurityTxtController;
use App\Http\Controllers\Seo\ShowSitemapController;
use App\Http\Controllers\ShowContactController;
use App\Http\Controllers\ShowContentPageController;
use App\Http\Controllers\ShowEditorController;
use App\Http\Controllers\ShowHomeController;
use App\Http\Controllers\ShowPlaceholderController;
use Illuminate\Support\Facades\Route;

Route::get('/', RedirectToLocaleController::class)->name('root');

Route::get('sitemap.xml', ShowSitemapController::class)->name('sitemap');
Route::get('robots.txt', ShowRobotsController::class)->name('robots');
Route::get('.well-known/security.txt', ShowSecurityTxtController::class)->name('security-txt');

// Public pages have a slug per language, such as /nl/printgids and
// /en/print-guide (B66). PublicPage holds the slugs; the `page` default tells
// the controller and the language switch which page this is.
foreach (PublicPage::withSlug() as $page) {
    $controller = $page === PublicPage::Contact ? ShowContactController::class : ShowContentPageController::class;

    // Two routes with the same URI would replace each other, so a slug that
    // is the same in every language gets one route.
    $slugs = array_unique(array_map(static fn (Locale $locale): string => $page->slug($locale), Locale::cases()));

    if (count($slugs) === 1) {
        Route::get('{locale}/' . $page->slug(Locale::default()), $controller)
            ->whereIn('locale', Locale::values())
            ->defaults('page', $page->value)
            ->name($page->value);

        continue;
    }

    foreach (Locale::cases() as $locale) {
        Route::get('{locale}/' . $page->slug($locale), $controller)
            ->where('locale', $locale->value)
            ->defaults('page', $page->value)
            ->name($page->value . '.' . $locale->value);
    }
}

Route::prefix('{locale}')
    ->whereIn('locale', Locale::values())
    ->group(function (): void {
        Route::get('/', ShowHomeController::class)->defaults('page', PublicPage::Home->value)->name('home');
        Route::get('editor', ShowEditorController::class)->name('editor');

        // Mijn edities is a placeholder until B79 is built.
        Route::get('editions', ShowPlaceholderController::class)
            ->defaults('titleKey', 'nav.my_editions')
            ->name('editions.index');
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
