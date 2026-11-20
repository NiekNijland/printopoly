<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Boxes\BoxPresenter;
use App\Http\Controllers\Controller;
use App\Models\CollectionBox;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The live box of an edition of the logged-in account (B128), so a second device finds the link and the
 * contributions without the owner secret from the first browser. Only the user's own boxes.
 */
final class ListBoxesController extends Controller
{
    public function __invoke(Request $request, BoxPresenter $presenter): JsonResponse
    {
        $request->validate(['edition' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/']]);
        $editionId = $request->string('edition')->toString();
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
