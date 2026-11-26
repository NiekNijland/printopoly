<?php

declare(strict_types=1);

use App\Http\Controllers\Account;
use App\Http\Controllers\Assets;
use App\Http\Controllers\Auth;
use App\Http\Controllers\Boxes;
use App\Http\Controllers\Editions;
use App\Http\Controllers\Pages;
use App\Http\Controllers\Print;
use App\Http\Controllers\Seo;
use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:pages')->group(static function (): void {
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
            Route::get('editions/{edition}/print', Print\EditionPrint\ShowController::class)
                ->where('edition', '[A-Za-z0-9_-]{8,64}')
                ->name('editions.print');
            Route::get('print', Print\PrintStart\ShowController::class)->name('print.start');

            // "Samen maken" (B123): the page friends open from the link. The token in the link is the key.
            Route::get('box/{token}', Boxes\Box\ShowController::class)
                ->where('token', '[A-Za-z0-9]{40}')
                ->name('boxes.show');
            Route::get('print/{printJob}', Print\PrintPage\ShowController::class)->name('print.show');
        });
});

// Print pipeline (B54, B60, B80, B95). JSON for the browser; every route that
// takes an id is authorised by a policy, and the routes of a job without an
// account by the job's secret token.
Route::prefix('api')->group(function (): void {
    // Per address: a class on one wifi uploads more than one family (§2.1 of test round 3), with a cap per hour.
    Route::post('print-jobs', Print\AnonymousPrintJob\StoreController::class)
        ->middleware('throttle:print-upload')
        ->name('print-jobs.store');
    // Mijn edities without an account: the state of the jobs whose tokens the browser kept with its editions.
    Route::post('print-jobs/ready', Print\PrintJobReady\ListController::class)
        ->middleware('throttle:print-ready')
        ->name('print-jobs.ready');

    Route::prefix('print/{printJob}')->group(function (): void {
        Route::get('status', Print\PrintStatus\ShowController::class)->middleware('throttle:print-files')->name('print.status');
        Route::post('photos', Print\AnonymousPrintPhotos\StoreController::class)->middleware('throttle:print-photos')->name('print.photos.store');
        Route::post('generate', Print\PrintRun\StartController::class)->middleware('throttle:print-generate')->name('print.generate');
        Route::post('choices', Print\PrintChoices\StoreController::class)->middleware('throttle:print-choices')->name('print.choices');
        Route::get('files/{set}/{part}', Print\PrintFile\DownloadController::class)->middleware('throttle:print-files')->name('print.download');
        Route::get('files/{set}/{part}/image', Print\PrintImage\DownloadController::class)->middleware('throttle:print-files')->name('print.image');
        Route::get('instructions/{part}', Print\Instructions\DownloadController::class)->middleware('throttle:print-files')->name('print.instructions');
        Route::get('zip/{set}', Print\PrintZip\DownloadController::class)->middleware('throttle:print-files')->name('print.zip');
    });
});

// "Samen maken" (B123). Friends add through the secret token of the link and can only add; the owner manages the
// box with the owner secret (header `X-Box-Owner`) or the account that made it, checked in BoxAccess (a box that is
// not yours is a 404). The picture for the group app needs neither.
Route::prefix('api')->group(function (): void {
    Route::prefix('box/{token}')->where(['token' => '[A-Za-z0-9]{40}'])->group(function (): void {
        Route::post('contributions', Boxes\Contribution\StoreController::class)
            ->middleware('throttle:box-contribute')
            ->name('api.box.contributions.store');
        Route::get('mine', Boxes\OwnContributions\ShowController::class)
            ->middleware('throttle:box-mine')
            ->name('api.box.mine');
        Route::get('mine/{receipt}/photo', Boxes\OwnContributionPhoto\ShowController::class)
            ->where('receipt', '[A-Za-z0-9]{32}')
            ->middleware('throttle:box-mine-photo')
            ->name('api.box.mine.photo');
    });

    Route::post('boxes', Boxes\Box\StoreController::class)->middleware('throttle:box-create')->name('api.boxes.store');
    Route::prefix('boxes/{boxId}')->middleware('throttle:box-owner')->group(function (): void {
        Route::get('/', Boxes\OwnerBox\ShowController::class)->name('api.boxes.show');
        Route::patch('/', Boxes\Box\UpdateController::class)->name('api.boxes.update');
        Route::delete('/', Boxes\Box\DeleteController::class)->name('api.boxes.destroy');
        Route::post('close', Boxes\Box\CloseController::class)->name('api.boxes.close');
        Route::post('renew', Boxes\Link\RenewController::class)->name('api.boxes.renew');
        Route::get('contributions/{contributionId}/photo', Boxes\ContributionPhoto\ShowController::class)->name('api.boxes.photo');
        Route::post('contributions/{contributionId}/resolve', Boxes\Contribution\ResolveController::class)->name('api.boxes.resolve');
    });

    Route::post('share-image', Boxes\ShareImage\StoreController::class)->middleware('throttle:share-image')->name('api.share-image.store');
    Route::get('share-image/{id}', Boxes\ShareImage\ShowController::class)
        ->where('id', '[A-Za-z0-9]{40}')
        ->middleware('throttle:share-image-poll')
        ->name('api.share-image.show');
});

// Chrome renders a page without an origin, so it fetches the built print page (script, chunks,
// fonts) across origins. These files are public anyway; the route adds the CORS header.
Route::get('print-assets/{path}', Print\RenderAsset\ShowController::class)
    ->where('path', 'build/.+')
    ->middleware('throttle:print-render')
    ->name('print.render.asset');

// Chrome fetches the cropped photos from here while it renders (B54). Only a
// signed link of a few minutes opens one.
Route::get('print-render/{printJob}/{folder}/{name}', Print\RenderCrop\ShowController::class)
    ->middleware(['signed:relative', 'throttle:print-render'])
    ->name('print.render.crop');

// Logging in is optional (B78). The routes answer 404 until Google
// credentials are configured.
Route::middleware(['guest', 'throttle:sign-in'])->group(function (): void {
    Route::get('auth/google/redirect', Auth\Google\RedirectController::class)->name('auth.google.redirect');
    Route::get('auth/google/callback', Auth\GoogleCallback\HandleController::class)->name('auth.google.callback');
});

Route::post('logout', Auth\Session\LogoutController::class)
    ->middleware(['auth', 'throttle:sign-out'])
    ->name('logout');

// The editions of a logged-in user (B60, B78, B81). JSON under the web
// session: CSRF and the session cookie apply. Editions without an account
// never come here; they stay in the browser.
Route::middleware('auth')->prefix('api')->name('api.')->group(function (): void {
    Route::middleware('throttle:editions')->group(function (): void {
        Route::get('editions', Editions\Edition\ListController::class)->name('editions.index');
        Route::get('editions/{edition}', Editions\Edition\ShowController::class)->name('editions.show');
        Route::patch('editions/{edition}', Editions\Edition\PatchController::class)->name('editions.patch');
        Route::put('editions/{edition}', Editions\Edition\ReplaceController::class)->name('editions.replace');
        Route::patch('editions/{edition}/name', Editions\Edition\RenameController::class)->name('editions.rename');
        Route::delete('editions/{edition}', Editions\Edition\DeleteController::class)->name('editions.destroy');
        // Printing for an edition of the account (B61, B69, B95).
        Route::post('editions/{edition}/print-job', Print\EditionPrintJob\StoreController::class)->name('editions.print-job.store');
        Route::get('assets/{asset}/preview', Assets\Preview\ShowController::class)->name('assets.preview');
        Route::get('print-ready', Print\EditionPrintReady\ListController::class)->name('print-ready.index');
        Route::get('boxes', Boxes\Box\ListController::class)->name('boxes.index');
    });

    Route::middleware('throttle:editions-create')->group(function (): void {
        Route::post('editions', Editions\Edition\StoreController::class)->name('editions.store');
        Route::post('editions/import', Editions\Edition\ImportController::class)->name('editions.import');
        Route::post('editions/{edition}/duplicate', Editions\Edition\DuplicateController::class)->name('editions.duplicate');
    });

    Route::post('editions/{edition}/assets', Editions\Asset\StoreController::class)
        ->middleware('throttle:edition-assets')
        ->name('editions.assets.store');

    Route::delete('account', Account\Account\DeleteController::class)
        ->middleware('throttle:account-delete')
        ->name('account.destroy');
});

// An unknown URL is a 404 inside the web group, so the error page gets the
// language of the path, the shared props and the SEO headers (B66).
Route::fallback(Pages\Missing\ShowController::class)->middleware('throttle:pages');
