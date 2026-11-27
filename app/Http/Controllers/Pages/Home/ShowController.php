<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\Home;

use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Support\ContentLibrary;
use Illuminate\Support\Facades\App;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The landing page (B97). Its texts come from resources/content/{locale}/landing.json.
 */
final readonly class ShowController
{
    public function __invoke(ContentLibrary $content): Response
    {
        $locale = Locale::from(App::getLocale());

        return Inertia::render('home', [
            'strings' => $content->landing($locale),
            'faq' => $content->homeFaq($locale),
        ]);
    }
}
