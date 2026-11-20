<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The print page before a job exists (B95): an edition that lives in this
 * browser. The page uploads it when the user clicks "Drukkerij-set maken"
 * (B80) and then continues on the page of the new job.
 */
final class ShowPrintStartController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('print/show', [
            'job' => null,
            'edition' => ['name' => '', 'cards' => 0, 'parts' => []],
            'localEditionId' => null,
        ]);
    }
}
