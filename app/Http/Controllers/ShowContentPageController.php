<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Content\ContentLibrary;
use App\Content\PrintGuide;
use App\Enums\Locale;
use App\Enums\PublicPage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The pages written in markdown: print guide, FAQ, privacy and terms (B67).
 * The route's `page` default says which one.
 */
final class ShowContentPageController extends Controller
{
    public function __invoke(Request $request, ContentLibrary $content, PrintGuide $guide): Response
    {
        $page = $request->route('page');
        $page = is_string($page) ? PublicPage::from($page) : PublicPage::Home;

        [$component, $file, $props] = match ($page) {
            PublicPage::PrintGuide => ['print-guide', 'printgids', []],
            PublicPage::Faq => ['faq', 'faq', []],
            PublicPage::Privacy => ['document', 'privacy', ['variant' => 'privacy']],
            PublicPage::Terms => ['document', 'voorwaarden', ['variant' => 'terms']],
            default => abort(404),
        };

        $locale = Locale::from(app()->getLocale());

        return Inertia::render($component, [
            // The print guide puts its parts together from the texts per part (B205).
            'document' => $page === PublicPage::PrintGuide ? $guide->page($locale) : $content->page($file, $locale),
            ...$props,
        ]);
    }
}
