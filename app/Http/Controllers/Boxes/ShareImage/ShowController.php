<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\ShareImage;

use App\Modules\Boxes\Data\ShareImageStatusData;
use App\Modules\Boxes\Support\ShareImages;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The browser asks for the picture it requested (B174). While the job works the answer is 202 with `waiting`; then
 * the PNG itself, or `failed` with a sentence. An unknown or expired id is a 404.
 */
final readonly class ShowController
{
    public function __invoke(Request $request, string $id, ShareImages $images): Response
    {
        $entry = $images->find($id) ?? throw new NotFoundHttpException();

        if ($entry['status'] === 'done') {
            return response($entry['png'], 200, [
                'Content-Type' => 'image/png',
                'Content-Disposition' => 'inline; filename="printopoly-groepsapp.png"',
                'Cache-Control' => 'private, no-store',
            ]);
        }

        $waiting = $entry['status'] === 'waiting';
        $status = $waiting ? new ShareImageStatusData('waiting') : new ShareImageStatusData('failed', __('boxes.share_image_failed'));

        $response = $status->toResponse($request)->setStatusCode($waiting ? 202 : 200);
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
