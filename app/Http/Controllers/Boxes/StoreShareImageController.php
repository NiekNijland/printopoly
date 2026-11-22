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
 * "Deel je bord" (B77, B128, B228): a PNG of the board as it is, 1080 pixels, for the group chat. The browser sends
 * its edition and small copies of the photos on the board; this request only checks them and puts a job on the queue
 * (B174), because Chrome cannot run inside the web server. The answer is an id to ask for the picture with. It needs
 * no account and is throttled per address, because every picture is a Chrome run.
 */
final class StoreShareImageController extends Controller
{
    public function __invoke(Request $request, ShareImageRenderer $renderer, ShareImages $images): JsonResponse
    {
        $request->validate([
            'edition' => ['required', 'array'],
            'photos' => ['sometimes', 'array', 'max:' . ShareImageRenderer::MAX_PHOTOS],
        ]);

        $input = $renderer->clean($request->array('edition'), $request->array('photos'));
        $id = Str::random(40);
        $images->waiting($id, $input);
        dispatch(new RenderShareImageJob($id));
        // Anonymous: only that a share image was asked for today (B206).
        resolve(FeatureCounter::class)->count(FeatureEvent::ShareImageMade);

        return response()->json(['id' => $id, 'status' => 'waiting'], 202)->header('Cache-Control', 'private, no-store');
    }
}
