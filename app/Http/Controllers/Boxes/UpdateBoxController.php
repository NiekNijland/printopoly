<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Boxes\BoxAccess;
use App\Boxes\BoxPresenter;
use App\Boxes\BoxSnapshot;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The owner changed names since the box was made: friends should see the current ones (B128). Only the
 * snapshot and the edition name change here; closing, the new link and deleting have their own routes.
 */
final class UpdateBoxController extends Controller
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, BoxSnapshot $snapshot, BoxPresenter $presenter): JsonResponse
    {
        $box = $access->owned($request, $boxId);
        $request->validate([
            'editionName' => ['nullable', 'string', 'max:120'],
            'snapshot' => ['nullable', 'array'],
        ]);

        if ($request->has('snapshot') && $request->input('snapshot') !== null) {
            $box->snapshot = $snapshot->clean($request->array('snapshot'));
        }

        if ($request->filled('editionName')) {
            $box->edition_name = mb_substr($request->string('editionName')->toString(), 0, 120);
        }

        $box->save();

        return response()->json($presenter->owner($box));
    }
}
