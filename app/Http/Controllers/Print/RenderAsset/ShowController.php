<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\RenderAsset;

use App\Http\Controllers\Controller;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves the built print page (the Vite output under public/build) with a CORS header.
 * Chrome renders HTML it was handed, so the page has no origin and its module scripts
 * are fetched across origins; plain static files carry no such header. The files are
 * public build output either way.
 */
final class ShowController extends Controller
{
    /** @var array<string, string> */
    private const array TYPES = [
        'js' => 'text/javascript',
        'css' => 'text/css',
        'woff2' => 'font/woff2',
        'woff' => 'font/woff',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'json' => 'application/json',
    ];

    public function __invoke(string $path): BinaryFileResponse
    {
        abort_unless(preg_match('#^build/[A-Za-z0-9._/-]+$#', $path) === 1 && ! str_contains($path, '..'), 404);

        $root = realpath(public_path('build'));
        $file = realpath(public_path($path));

        abort_if($root === false || $file === false || ! str_starts_with($file, $root . DIRECTORY_SEPARATOR) || ! is_file($file), 404);

        $type = self::TYPES[strtolower(pathinfo($file, PATHINFO_EXTENSION))] ?? null;
        abort_if($type === null, 404);

        return response()->file($file, [
            'Content-Type' => $type,
            'Access-Control-Allow-Origin' => '*',
            'Cache-Control' => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
