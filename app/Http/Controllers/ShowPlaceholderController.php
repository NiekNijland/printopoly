<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Stands in for public pages that do not exist yet, so the header and footer
 * link somewhere real. The route's `titleKey` default names the heading.
 */
final class ShowPlaceholderController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $titleKey = $request->route('titleKey');

        return Inertia::render('placeholder', [
            'titleKey' => is_string($titleKey) ? $titleKey : 'app.name',
        ]);
    }
}
