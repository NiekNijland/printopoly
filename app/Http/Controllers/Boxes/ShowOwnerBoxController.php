<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Boxes\BoxAccess;
use App\Boxes\BoxPresenter;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The state of a box and the contributions waiting, for the owner only (B128). The editor asks again every
 * few seconds and when a Reverb message says something arrived.
 */
final class ShowOwnerBoxController extends Controller
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, BoxPresenter $presenter): JsonResponse
    {
        return response()->json($presenter->owner($access->owned($request, $boxId)))
            ->header('Cache-Control', 'private, no-store');
    }
}
