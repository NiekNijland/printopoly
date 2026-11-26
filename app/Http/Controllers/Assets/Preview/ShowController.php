<?php

declare(strict_types=1);

namespace App\Http\Controllers\Assets\Preview;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

/**
 * Photos are private (B68): the owner is sent to a temporary link of 5 minutes.
 */
final class ShowController extends Controller
{
    public function __invoke(Asset $asset): RedirectResponse
    {
        Gate::authorize('view', $asset);

        return redirect()->away(Storage::disk($asset->disk)->temporaryUrl($asset->preview_path, CarbonImmutable::now()->addMinutes(5)));
    }
}
