<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\SampleEdition;

use App\Http\Requests\Pages\TemplatePageRequest;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Voorbeeld bekijken" (B97): the sample edition, read-only, with a button
 * that copies it into a new edition in this browser. `?template=` shows a
 * starting point instead (B127).
 */
final readonly class ShowController
{
    public function __invoke(TemplatePageRequest $request): Response
    {
        return Inertia::render('editions/sample', [
            'template' => $request->template(),
        ]);
    }
}
