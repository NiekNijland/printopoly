<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\ContentPage;

use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use App\Modules\Content\Support\ContentLibrary;
use App\Modules\Content\Support\PrintGuide;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The pages written in markdown: print guide, FAQ, privacy and terms (B67).
 * The route's `page` default says which one.
 */
final readonly class ShowController
{
    public function __invoke(Request $request, ContentLibrary $content, PrintGuide $guide): Response
    {
        $page = $request->route('page');
        $page = is_string($page) ? PublicPage::from($page) : PublicPage::Home;

        $locale = Locale::from(app()->getLocale());

        return match ($page) {
            // The print guide puts its parts together from the texts per part (B205).
            PublicPage::PrintGuide => Inertia::render('print-guide', ['document' => $guide->page($locale)]),
            PublicPage::Faq => Inertia::render('faq', ['document' => $content->page('faq', $locale)]),
            PublicPage::Privacy => Inertia::render('document', ['document' => $content->page('privacy', $locale), 'variant' => 'privacy']),
            PublicPage::Terms => Inertia::render('document', ['document' => $content->page('voorwaarden', $locale), 'variant' => 'terms']),
            default => throw new NotFoundHttpException(),
        };
    }
}
