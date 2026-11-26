<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\OwnContributions;

use App\Http\Controllers\Controller;
use App\Http\Requests\Boxes\ShowOwnContributionsRequest;
use App\Models\BoxContribution;
use App\Models\CollectionBox;
use Illuminate\Http\JsonResponse;

/**
 * What became of the things a friend sent (B128). The friend's browser holds a receipt per contribution and asks
 * with those. A receipt that is still in the box is `waiting`; one that is gone is `applied` when something of it
 * went into the edition and `passed` when not (B175), or `handled` for one from before that was remembered. A
 * friend can only ask about their own receipts, and the answer holds no names, texts or photos of anybody.
 */
final class ShowController extends Controller
{
    public function __invoke(ShowOwnContributionsRequest $request, string $token): JsonResponse
    {
        $box = CollectionBox::query()->where('token', $token)->first();

        abort_unless($box instanceof CollectionBox && $box->expires_at->isFuture(), 404);

        $receipts = $request->receipts();
        $waiting = BoxContribution::query()
            ->where('box_id', $box->publicId())
            ->whereIn('receipt', $receipts)
            ->pluck('receipt')
            ->all();

        $result = [];
        foreach ($receipts as $receipt) {
            $result[$receipt] = in_array($receipt, $waiting, true) ? 'waiting' : ($box->outcomes[$receipt] ?? 'handled');
        }

        return response()->json(['contributions' => $result])->header('Cache-Control', 'private, no-store');
    }
}
