<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves a cropped photo to Chrome while it renders (B54). Only a signed,
 * short-lived link opens it (the `signed` middleware on the route); the file
 * name is checked so the path cannot leave the job's work folder.
 */
final class ShowRenderCropController extends Controller
{
    public function __invoke(PrintJob $printJob, string $folder, string $name): StreamedResponse
    {
        abort_unless(preg_match('/^[a-z_-]{3,40}$/', $folder) === 1 && preg_match('/^[a-f0-9]{40}\.(jpg|png)$/', $name) === 1, 404);

        $path = 'print-work/' . $printJob->publicId() . '/' . $folder . '/' . $name;
        $disk = Storage::disk(config()->string('printopoly.storage.disk'));

        abort_unless($disk->exists($path), 404);

        return $disk->response($path, $name, ['Content-Type' => str_ends_with($name, '.png') ? 'image/png' : 'image/jpeg', 'Cache-Control' => 'private, max-age=600']);
    }
}
