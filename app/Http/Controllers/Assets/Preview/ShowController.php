<?php

declare(strict_types=1);

namespace App\Http\Controllers\Assets\Preview;

use App\Models\Asset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

/**
 * Photos are private (B68): the owner is sent to a temporary link of 5 minutes.
 */
final readonly class ShowController
{
    public function __invoke(Asset $asset): RedirectResponse
    {
        return redirect()->away(Storage::disk($asset->disk)->temporaryUrl($asset->preview_path, now()->addMinutes(5)));
    }
}
