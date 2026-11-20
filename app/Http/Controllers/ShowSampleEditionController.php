<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * "Voorbeeld bekijken" (B97): the sample edition, read-only, with a button
 * that copies it into a new edition in this browser.
 */
final class ShowSampleEditionController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('editions/sample');
    }
}
