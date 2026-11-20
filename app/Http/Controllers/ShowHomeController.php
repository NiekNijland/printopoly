<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Content\ContentLibrary;
use App\Data\FaqItemData;
use App\Enums\Locale;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The landing page (B97). Its texts come from resources/content/{locale}/landing.json.
 */
final class ShowHomeController extends Controller
{
    /**
     * The questions the landing page shows, by position in faq.md: cost,
     * account, which board, photos of friends, Hasbro. The rest is on the
     * FAQ page.
     */
    private const array FAQ_POSITIONS = [0, 1, 2, 6, 13];

    public function __invoke(ContentLibrary $content): Response
    {
        $locale = Locale::from(app()->getLocale());
        $faq = $content->faq($locale);

        return Inertia::render('home', [
            'strings' => $content->landing($locale),
            'faq' => array_values(array_filter(
                array_map(static fn (int $position): ?FaqItemData => $faq[$position] ?? null, self::FAQ_POSITIONS),
            )),
        ]);
    }
}
