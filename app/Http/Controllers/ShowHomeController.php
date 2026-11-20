<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Content\ContentLibrary;
use App\Enums\Locale;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The landing page (B97). Its texts come from resources/content/{locale}/landing.json.
 */
final class ShowHomeController extends Controller
{
    public function __invoke(ContentLibrary $content): Response
    {
        $locale = Locale::from(app()->getLocale());

        return Inertia::render('home', [
            'strings' => $content->landing($locale),
            'faq' => $content->homeFaq($locale),
        ]);
    }
}
