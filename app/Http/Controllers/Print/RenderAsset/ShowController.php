<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\RenderAsset;

use App\Modules\Print\Services\RenderFileService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves the built print page (the Vite output under public/build) with a CORS header.
 * Chrome renders HTML it was handed, so the page has no origin and its module scripts
 * are fetched across origins; plain static files carry no such header. The files are
 * public build output either way.
 */
final readonly class ShowController
{
    public function __invoke(string $path, RenderFileService $files): BinaryFileResponse
    {
        $asset = $files->asset($path);

        return response()->file($asset['file'], [
            'Content-Type' => $asset['type'],
            'Access-Control-Allow-Origin' => '*',
            'Cache-Control' => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
