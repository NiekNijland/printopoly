<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Controllers\Controller;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use App\Modules\Boxes\Support\BoxSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The owner changed names since the box was made: friends should see the current ones (B128). Only the
 * snapshot, the edition name and whether friends see the card texts (B176) change here; closing, the new link and
 * deleting have their own routes.
 */
final class UpdateController extends Controller
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, BoxSnapshot $snapshot, BoxPresenter $presenter): JsonResponse
    {
        $box = $access->owned($request, $boxId);
        $request->validate([
            'editionName' => ['nullable', 'string', 'max:120'],
            'snapshot' => ['nullable', 'array'],
            'cardsHidden' => ['nullable', 'boolean'],
        ]);

        if ($request->has('cardsHidden') && $request->input('cardsHidden') !== null) {
            $box->cards_hidden = $request->boolean('cardsHidden');
        }

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
