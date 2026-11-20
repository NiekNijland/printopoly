<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Content\ContentLibrary;
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
    public function __invoke(Request $request, ContentLibrary $content): Response
    {
        $page = $request->route('page');
        $page = is_string($page) ? PublicPage::from($page) : PublicPage::Home;

        [$component, $file] = match ($page) {
            PublicPage::PrintGuide => ['print-guide', 'printgids'],
            PublicPage::Faq => ['faq', 'faq'],
            PublicPage::Privacy => ['document', 'privacy'],
            PublicPage::Terms => ['document', 'voorwaarden'],
            default => abort(404),
        };

        return Inertia::render($component, [
            'document' => $content->page($file, Locale::from(app()->getLocale())),
        ]);
    }
}
