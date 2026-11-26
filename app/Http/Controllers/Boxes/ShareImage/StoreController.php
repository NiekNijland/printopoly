<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\ShareImage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Boxes\StoreShareImageRequest;
use App\Modules\Analytics\Enums\FeatureEvent;
use App\Modules\Analytics\Support\FeatureCounter;
use App\Modules\Boxes\Jobs\RenderShareImageJob;
use App\Modules\Boxes\Support\ShareImageRenderer;
use App\Modules\Boxes\Support\ShareImages;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/**
 * "Deel je bord" (B77, B128, B228): a PNG of the board as it is, 1080 pixels, for the group chat. The browser sends
 * its edition and small copies of the photos on the board; this request only checks them and puts a job on the queue
 * (B174), because Chrome cannot run inside the web server. The answer is an id to ask for the picture with. It needs
 * no account and is throttled per address, because every picture is a Chrome run.
 */
final class StoreController extends Controller
{
    public function __invoke(StoreShareImageRequest $request, ShareImageRenderer $renderer, ShareImages $images): JsonResponse
    {
        $input = $renderer->clean($request->edition(), $request->photos());
        $id = Str::random(40);
        $images->waiting($id, $input);
        dispatch(new RenderShareImageJob($id));
        // Anonymous: only that a share image was asked for today (B206).
        resolve(FeatureCounter::class)->count(FeatureEvent::ShareImageMade);

        return response()->json(['id' => $id, 'status' => 'waiting'], 202)->header('Cache-Control', 'private, no-store');
    }
}
