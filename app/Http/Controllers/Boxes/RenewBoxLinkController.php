<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Boxes\BoxAccess;
use App\Boxes\BoxPresenter;
use App\Http\Controllers\Controller;
use App\Models\CollectionBox;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * A new link for the same box (B128): the old link stops working at once (it no longer finds a box), the
 * contributions already sent stay, and the box opens again. For a link that ended up where it should not. The box
 * remembers a hash of the old link, so a friend who opens it reads that it was replaced (B175).
 */
final class RenewBoxLinkController extends Controller
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, BoxPresenter $presenter): JsonResponse
    {
        $box = $access->owned($request, $boxId);
        $box->replaced_tokens = array_slice([CollectionBox::tokenHash($box->token), ...($box->replaced_tokens ?? [])], 0, CollectionBox::REMEMBERED_TOKENS);
        $box->token = Str::random(40);
        $box->status = CollectionBox::OPEN;
        $box->last_activity_at = CarbonImmutable::now();
        $box->expires_at = CarbonImmutable::now()->addDays(config()->integer('printopoly.boxes.retention_days'));
        $box->save();

        return response()->json($presenter->owner($box));
    }
}
