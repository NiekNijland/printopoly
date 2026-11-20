<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * The one-screen new edition form (B72, B99). It creates the edition in the
 * browser and then opens the editor.
 */
final class ShowNewEditionController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('editions/create');
    }
}
