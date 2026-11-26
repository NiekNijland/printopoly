<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\Editor;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The editor for one edition (B73, B93). The edition itself is read from the
 * browser's storage by the page; the server only knows its id. Rendered
 * client-side only (B66).
 */
final class ShowController extends Controller
{
    public function __invoke(string $locale, string $edition): Response
    {
        return Inertia::render('editor/show', [
            'editionId' => $edition,
        ]);
    }
}
