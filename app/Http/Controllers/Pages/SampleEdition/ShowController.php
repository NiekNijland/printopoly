<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\SampleEdition;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Voorbeeld bekijken" (B97): the sample edition, read-only, with a button
 * that copies it into a new edition in this browser. `?template=` shows a
 * starting point instead (B127).
 */
final class ShowController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $template = $request->query('template');

        return Inertia::render('editions/sample', [
            'template' => is_string($template) ? $template : null,
        ]);
    }
}
