<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Placeholder that renders the editor layout shell until the editor exists.
 * Rendered client-side only (B66).
 */
final class ShowEditorController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('editor/show');
    }
}
