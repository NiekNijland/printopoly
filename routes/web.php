<?php

declare(strict_types=1);

use App\Http\Controllers\Account\DeleteAccountController;
use App\Http\Controllers\Assets;
use App\Http\Controllers\Auth\HandleGoogleCallbackController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RedirectToGoogleController;
use App\Http\Controllers\Boxes\CloseBoxController;
use App\Http\Controllers\Boxes\DeleteBoxController;
use App\Http\Controllers\Boxes\ListBoxesController;
use App\Http\Controllers\Boxes\RenewBoxLinkController;
use App\Http\Controllers\Boxes\ResolveContributionController;
use App\Http\Controllers\Boxes\ShowBoxPageController;
use App\Http\Controllers\Boxes\ShowContributionPhotoController;
use App\Http\Controllers\Boxes\ShowOwnContributionPhotoController;
use App\Http\Controllers\Boxes\ShowOwnContributionsController;
use App\Http\Controllers\Boxes\ShowOwnerBoxController;
use App\Http\Controllers\Boxes\ShowShareImageController;
use App\Http\Controllers\Boxes\StoreBoxController;
use App\Http\Controllers\Boxes\StoreContributionController;
use App\Http\Controllers\Boxes\StoreShareImageController;
use App\Http\Controllers\Boxes\UpdateBoxController;
use App\Http\Controllers\Editions;
use App\Http\Controllers\Pages;
use App\Http\Controllers\Print\DownloadInstructionsController;
use App\Http\Controllers\Print\DownloadPrintFileController;
use App\Http\Controllers\Print\DownloadPrintImageController;
use App\Http\Controllers\Print\DownloadPrintZipController;
use App\Http\Controllers\Print\ListEditionPrintReadyController;
use App\Http\Controllers\Print\ListPrintJobReadyController;
use App\Http\Controllers\Print\ShowEditionPrintController;
use App\Http\Controllers\Print\ShowPrintPageController;
use App\Http\Controllers\Print\ShowPrintStartController;
use App\Http\Controllers\Print\ShowPrintStatusController;
use App\Http\Controllers\Print\ShowRenderAssetController;
use App\Http\Controllers\Print\ShowRenderCropController;
use App\Http\Controllers\Print\StartPrintRunController;
use App\Http\Controllers\Print\StoreAnonymousPrintJobController;
use App\Http\Controllers\Print\StoreAnonymousPrintPhotosController;
use App\Http\Controllers\Print\StoreEditionPrintJobController;
use App\Http\Controllers\Print\StorePrintChoicesController;
use App\Http\Controllers\Seo;
use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use Illuminate\Support\Facades\Route;

Route::get('/', Pages\Locale\RedirectController::class)->name('root');

Route::get('sitemap.xml', Seo\Sitemap\ShowController::class)->name('sitemap');
// robots.txt is a static file in public/, so Cloudflare's managed block is added to it as to motormonitor's.
Route::get('.well-known/security.txt', Seo\SecurityTxt\ShowController::class)->name('security-txt');

// Public pages have a slug per language, such as /nl/printgids and
// /en/print-guide (B66). PublicPage holds the slugs; the `page` default tells
// the controller and the language switch which page this is.
foreach (PublicPage::withSlug() as $page) {
    $controller = $page === PublicPage::Contact ? Pages\Contact\ShowController::class : Pages\ContentPage\ShowController::class;

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
        Route::get('/', Pages\Home\ShowController::class)->defaults('page', PublicPage::Home->value)->name('home');
        // Editions live in the browser (B78), so these pages are client-only and
        // an edition id is just a string the page looks up in IndexedDB.
        Route::get('editions', Pages\Editions\ShowController::class)->name('editions.index');
        Route::get('editions/new', Pages\Edition\CreateController::class)->name('editions.create');
        Route::get('editions/sample', Pages\SampleEdition\ShowController::class)->name('editions.sample');
        Route::get('editor/{edition}', Pages\Editor\ShowController::class)
            ->where('edition', '[A-Za-z0-9_-]{8,64}')
            ->name('editor.show');

        // The print page (B95). The editor's "Printen" button goes to `editions.print`: the owner of a
        // stored edition lands on the page of its job, anybody else on the page that uploads the local
        // edition. A job without an account is opened by its secret token.
        Route::get('editions/{edition}/print', ShowEditionPrintController::class)
            ->where('edition', '[A-Za-z0-9_-]{8,64}')
            ->name('editions.print');
        Route::get('print', ShowPrintStartController::class)->name('print.start');

        // "Samen maken" (B123): the page friends open from the link. The token in the link is the key.
        Route::get('box/{token}', ShowBoxPageController::class)
            ->where('token', '[A-Za-z0-9]{40}')
            ->name('boxes.show');
        Route::get('print/{printJob}', ShowPrintPageController::class)->name('print.show');
    });

// Print pipeline (B54, B60, B80, B95). JSON for the browser; every route that
// takes an id is authorised by a policy, and the routes of a job without an
// account by the job's secret token.
Route::prefix('api')->group(function (): void {
    // Per address: a class on one wifi uploads more than one family (§2.1 of test round 3), with a cap per hour.
    Route::post('print-jobs', StoreAnonymousPrintJobController::class)
        ->middleware('throttle:print-upload')
        ->name('print-jobs.store');
    // Mijn edities without an account: the state of the jobs whose tokens the browser kept with its editions.
    Route::post('print-jobs/ready', ListPrintJobReadyController::class)
        ->middleware('throttle:30,1')
        ->name('print-jobs.ready');

    Route::prefix('print/{printJob}')->group(function (): void {
        Route::get('status', ShowPrintStatusController::class)->name('print.status');
        Route::post('photos', StoreAnonymousPrintPhotosController::class)->middleware('throttle:60,1')->name('print.photos.store');
        Route::post('generate', StartPrintRunController::class)->middleware('throttle:30,1')->name('print.generate');
        Route::post('choices', StorePrintChoicesController::class)->middleware('throttle:60,1')->name('print.choices');
        Route::get('files/{set}/{part}', DownloadPrintFileController::class)->name('print.download');
        Route::get('files/{set}/{part}/image', DownloadPrintImageController::class)->name('print.image');
        Route::get('instructions/{part}', DownloadInstructionsController::class)->name('print.instructions');
        Route::get('zip/{set}', DownloadPrintZipController::class)->name('print.zip');
    });
});

// "Samen maken" (B123). Friends add through the secret token of the link and can only add; the owner manages the
// box with the owner secret (header `X-Box-Owner`) or the account that made it, checked in BoxAccess (a box that is
// not yours is a 404). The picture for the group app needs neither.
Route::prefix('api')->group(function (): void {
    Route::prefix('box/{token}')->where(['token' => '[A-Za-z0-9]{40}'])->group(function (): void {
        Route::post('contributions', StoreContributionController::class)
            ->middleware('throttle:box-contribute')
            ->name('api.box.contributions.store');
        Route::get('mine', ShowOwnContributionsController::class)
            ->middleware('throttle:60,1')
            ->name('api.box.mine');
        Route::get('mine/{receipt}/photo', ShowOwnContributionPhotoController::class)
            ->where('receipt', '[A-Za-z0-9]{32}')
            ->middleware('throttle:120,1')
            ->name('api.box.mine.photo');
    });

    Route::post('boxes', StoreBoxController::class)->middleware('throttle:10,1')->name('api.boxes.store');
    Route::prefix('boxes/{boxId}')->middleware('throttle:box-owner')->group(function (): void {
        Route::get('/', ShowOwnerBoxController::class)->name('api.boxes.show');
        Route::patch('/', UpdateBoxController::class)->name('api.boxes.update');
        Route::delete('/', DeleteBoxController::class)->name('api.boxes.destroy');
        Route::post('close', CloseBoxController::class)->name('api.boxes.close');
        Route::post('renew', RenewBoxLinkController::class)->name('api.boxes.renew');
        Route::get('contributions/{contributionId}/photo', ShowContributionPhotoController::class)->name('api.boxes.photo');
        Route::post('contributions/{contributionId}/resolve', ResolveContributionController::class)->name('api.boxes.resolve');
    });

    Route::post('share-image', StoreShareImageController::class)->middleware('throttle:share-image')->name('api.share-image.store');
    Route::get('share-image/{id}', ShowShareImageController::class)
        ->where('id', '[A-Za-z0-9]{40}')
        ->middleware('throttle:share-image-poll')
        ->name('api.share-image.show');
});

// Chrome renders a page without an origin, so it fetches the built print page (script, chunks,
// fonts) across origins. These files are public anyway; the route adds the CORS header.
Route::get('print-assets/{path}', ShowRenderAssetController::class)
    ->where('path', 'build/.+')
    ->name('print.render.asset');

// Chrome fetches the cropped photos from here while it renders (B54). Only a
// signed link of a few minutes opens one.
Route::get('print-render/{printJob}/{folder}/{name}', ShowRenderCropController::class)
    ->middleware('signed:relative')
    ->name('print.render.crop');

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
    Route::get('editions', Editions\Edition\ListController::class)->name('editions.index');
    Route::get('editions/{edition}', Editions\Edition\ShowController::class)->name('editions.show');
    Route::patch('editions/{edition}', Editions\Edition\PatchController::class)->name('editions.patch');
    Route::put('editions/{edition}', Editions\Edition\ReplaceController::class)->name('editions.replace');
    Route::patch('editions/{edition}/name', Editions\Edition\RenameController::class)->name('editions.rename');
    Route::delete('editions/{edition}', Editions\Edition\DeleteController::class)->name('editions.destroy');

    Route::middleware('throttle:editions-create')->group(function (): void {
        Route::post('editions', Editions\Edition\StoreController::class)->name('editions.store');
        Route::post('editions/import', Editions\Edition\ImportController::class)->name('editions.import');
        Route::post('editions/{edition}/duplicate', Editions\Edition\DuplicateController::class)->name('editions.duplicate');
    });

    // Photos and printing for an edition of the account (B61, B69, B95).
    Route::post('editions/{edition}/assets', Editions\Asset\StoreController::class)
        ->middleware('throttle:60,1')
        ->name('editions.assets.store');
    Route::post('editions/{edition}/print-job', StoreEditionPrintJobController::class)->name('editions.print-job.store');
    Route::get('assets/{asset}/preview', Assets\Preview\ShowController::class)->name('assets.preview');
    Route::get('print-ready', ListEditionPrintReadyController::class)->name('print-ready.index');

    Route::get('boxes', ListBoxesController::class)->name('boxes.index');

    Route::delete('account', DeleteAccountController::class)
        ->middleware('throttle:account-delete')
        ->name('account.destroy');
});

// An unknown URL is a 404 inside the web group, so the error page gets the
// language of the path, the shared props and the SEO headers (B66).
Route::fallback(static fn (): never => abort(404));
