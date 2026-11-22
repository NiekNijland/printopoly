<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Enums\FeatureEvent;
use App\Http\Controllers\Controller;
use App\Jobs\RenderShareImageJob;
use App\Print\ShareImageRenderer;
use App\Print\ShareImages;
use App\Support\FeatureCounter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * "Plaatje voor de groepsapp" (B77, B128): a PNG of the board with its names, 1080 pixels, to send along with the
 * link. The browser sends the names of its edition; this request only keeps what the picture needs and puts a job
 * on the queue (B174), because Chrome cannot run inside the web server. The answer is an id to ask for the picture
 * with. It needs no account and is throttled per address, because every picture is a Chrome run.
 */
final class StoreShareImageController extends Controller
{
    public function __invoke(Request $request, ShareImageRenderer $renderer, ShareImages $images): JsonResponse
    {
        $request->validate([
            'edition' => ['required', 'array'],
        ]);

        $id = Str::random(40);
        $images->waiting($id);
        dispatch(new RenderShareImageJob($id, $renderer->clean($request->array('edition'))));
        // Anonymous: only that a share image was asked for today (B206).
        resolve(FeatureCounter::class)->count(FeatureEvent::ShareImageMade);

        return response()->json(['id' => $id, 'status' => 'waiting'], 202)->header('Cache-Control', 'private, no-store');
    }
}
