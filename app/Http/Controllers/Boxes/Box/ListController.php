<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Controllers\Controller;
use App\Http\Requests\Boxes\ListBoxesRequest;
use App\Models\CollectionBox;
use App\Models\User;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\JsonResponse;

/**
 * The live box of an edition of the logged-in account (B128), so a second device finds the link and the
 * contributions without the owner secret from the first browser. Only the user's own boxes.
 */
final class ListController extends Controller
{
    public function __invoke(ListBoxesRequest $request, BoxPresenter $presenter): JsonResponse
    {
        $editionId = $request->editionId();
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        $box = CollectionBox::query()
            ->where('user_id', $user->publicId())
            ->where('edition_id', $editionId)
            ->where('expires_at', '>', now()->toDateTime())
            ->first();

        return response()->json(['box' => $box instanceof CollectionBox ? $presenter->owner($box) : null])
            ->header('Cache-Control', 'private, no-store');
    }
}
