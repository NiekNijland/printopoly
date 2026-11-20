<?php

declare(strict_types=1);

use App\Enums\Locale;
use App\Enums\PublicPage;
use App\Http\Controllers\Account\DeleteAccountController;
use App\Http\Controllers\Auth\HandleGoogleCallbackController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RedirectToGoogleController;
use App\Http\Controllers\Editions\CreateEditionController;
use App\Http\Controllers\Editions\DeleteEditionController;
use App\Http\Controllers\Editions\DuplicateEditionController;
use App\Http\Controllers\Editions\ImportEditionsController;
use App\Http\Controllers\Editions\ListEditionsController;
use App\Http\Controllers\Editions\PatchEditionController;
use App\Http\Controllers\Editions\RenameEditionController;
use App\Http\Controllers\Editions\ReplaceEditionController;
use App\Http\Controllers\Editions\ShowEditionController;
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
    $slugs = array_unique(array_map($page->slug(...), Locale::cases()));

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

// The editions of a logged-in user (B60, B78, B81). JSON under the web
// session: CSRF and the session cookie apply. Editions without an account
// never come here; they stay in the browser.
Route::middleware(['auth', 'throttle:editions'])->prefix('api')->name('api.')->group(function (): void {
    Route::get('editions', ListEditionsController::class)->name('editions.index');
    Route::get('editions/{edition}', ShowEditionController::class)->name('editions.show');
    Route::patch('editions/{edition}', PatchEditionController::class)->name('editions.patch');
    Route::put('editions/{edition}', ReplaceEditionController::class)->name('editions.replace');
    Route::patch('editions/{edition}/name', RenameEditionController::class)->name('editions.rename');
    Route::delete('editions/{edition}', DeleteEditionController::class)->name('editions.destroy');

    Route::middleware('throttle:editions-create')->group(function (): void {
        Route::post('editions', CreateEditionController::class)->name('editions.store');
        Route::post('editions/import', ImportEditionsController::class)->name('editions.import');
        Route::post('editions/{edition}/duplicate', DuplicateEditionController::class)->name('editions.duplicate');
    });

    Route::delete('account', DeleteAccountController::class)
        ->middleware('throttle:account-delete')
        ->name('account.destroy');
});
