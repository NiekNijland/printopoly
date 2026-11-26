<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\ShareImage;

use App\Http\Controllers\Controller;
use App\Modules\Boxes\Support\ShareImages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * The browser asks for the picture it requested (B174). While the job works the answer is 202 with `waiting`; then
 * the PNG itself, or `failed` with a sentence. An unknown or expired id is a 404.
 */
final class ShowController extends Controller
{
    public function __invoke(string $id, ShareImages $images): JsonResponse|Response
    {
        $entry = $images->find($id);

        abort_if($entry === null, 404);

        if ($entry['status'] === 'done') {
            return response($entry['png'], 200, [
                'Content-Type' => 'image/png',
                'Content-Disposition' => 'inline; filename="printopoly-groepsapp.png"',
                'Cache-Control' => 'private, no-store',
            ]);
        }

        $waiting = $entry['status'] === 'waiting';

        return response()->json(
            $waiting ? ['status' => 'waiting'] : ['status' => 'failed', 'message' => __('boxes.share_image_failed')],
            $waiting ? 202 : 200,
        )->header('Cache-Control', 'private, no-store');
    }
}
