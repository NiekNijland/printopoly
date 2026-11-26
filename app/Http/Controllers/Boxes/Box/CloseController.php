<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Controllers\Controller;
use App\Models\CollectionBox;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The owner closes the box (B128): the link stays, but friends can no longer add anything. What is already
 * inside can still be accepted or rejected.
 */
final class CloseController extends Controller
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, BoxPresenter $presenter): JsonResponse
    {
        $box = $access->owned($request, $boxId);
        $box->status = CollectionBox::CLOSED;
        $box->save();

        return response()->json($presenter->owner($box));
    }
}
