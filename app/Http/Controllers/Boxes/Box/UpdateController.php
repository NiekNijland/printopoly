<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Controllers\Controller;
use App\Http\Requests\Boxes\UpdateBoxRequest;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use App\Modules\Boxes\Support\BoxSnapshot;
use Illuminate\Http\JsonResponse;

/**
 * The owner changed names since the box was made: friends should see the current ones (B128). Only the
 * snapshot, the edition name and whether friends see the card texts (B176) change here; closing, the new link and
 * deleting have their own routes.
 */
final class UpdateController extends Controller
{
    public function __invoke(UpdateBoxRequest $request, string $boxId, BoxAccess $access, BoxSnapshot $snapshot, BoxPresenter $presenter): JsonResponse
    {
        $box = $access->owned($request, $boxId);
        $cardsHidden = $request->cardsHidden();
        $newSnapshot = $request->snapshot();
        $editionName = $request->editionName();

        if ($cardsHidden !== null) {
            $box->cards_hidden = $cardsHidden;
        }

        if ($newSnapshot !== null) {
            $box->snapshot = $snapshot->clean($newSnapshot);
        }

        if ($editionName !== null) {
            $box->edition_name = mb_substr($editionName, 0, 120);
        }

        $box->save();

        return response()->json($presenter->owner($box));
    }
}
