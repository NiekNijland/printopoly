<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\OwnerBox;

use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The state of a box and the contributions waiting, for the owner only (B128). The editor asks again every
 * few seconds and when a Reverb message says something arrived.
 */
final readonly class ShowController
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, BoxPresenter $presenter): Response
    {
        $response = $presenter->owner($access->owned($request, $boxId))->toResponse($request);
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
