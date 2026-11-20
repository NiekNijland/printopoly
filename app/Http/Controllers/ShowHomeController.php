<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Placeholder until the landing page (B97) is built.
 */
final class ShowHomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('home');
    }
}
