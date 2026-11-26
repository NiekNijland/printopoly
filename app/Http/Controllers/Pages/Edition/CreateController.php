<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\Edition;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The one-screen new edition form (B72, B99). It creates the edition in the
 * browser and then opens the editor. `?template=` preselects a starting point (B127).
 */
final class CreateController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $template = $request->query('template');

        return Inertia::render('editions/create', [
            'template' => is_string($template) ? $template : null,
        ]);
    }
}
