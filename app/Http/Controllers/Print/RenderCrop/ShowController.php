<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\RenderCrop;

use App\Models\PrintJob;
use App\Modules\Print\Services\RenderFileService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves a cropped photo to Chrome while it renders (B54). Only a signed,
 * short-lived link opens it (the `signed` middleware on the route); the file
 * name is checked so the path cannot leave the job's work folder.
 */
final readonly class ShowController
{
    public function __invoke(PrintJob $printJob, string $folder, string $name, RenderFileService $files): StreamedResponse
    {
        $path = $files->crop($printJob, $folder, $name);

        return Storage::disk(Config::string('printopoly.storage.disk'))->response($path, $name, ['Content-Type' => str_ends_with($name, '.png') ? 'image/png' : 'image/jpeg', 'Cache-Control' => 'private, max-age=600']);
    }
}
