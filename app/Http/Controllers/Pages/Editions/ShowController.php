<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\Editions;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Mijn edities (B79, B96). The list lives in the browser, so the page is
 * rendered client-side only (B66).
 */
final readonly class ShowController
{
    public function __invoke(): Response
    {
        return Inertia::render('editions/index');
    }
}
