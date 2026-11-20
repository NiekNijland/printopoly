<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Boxes\BoxAccess;
use App\Boxes\BoxCleanup;
use App\Boxes\BoxPresenter;
use App\Http\Controllers\Controller;
use App\Models\BoxContribution;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The owner has decided about a contribution (B128). The browser applies an accepted one to the local edition
 * first (the photo goes into IndexedDB) and then tells the server, which deletes the contribution and its photo.
 */
final class ResolveContributionController extends Controller
{
    public function __invoke(Request $request, string $boxId, string $contributionId, BoxAccess $access, BoxCleanup $cleanup, BoxPresenter $presenter): JsonResponse
    {
        $box = $access->owned($request, $boxId);
        $request->validate(['decision' => ['required', 'in:accept,reject']]);

        $contribution = BoxContribution::query()
            ->where('box_id', $box->publicId())
            ->where('_id', $contributionId)
            ->first();

        if (! $contribution instanceof BoxContribution) {
            throw new NotFoundHttpException();
        }

        $cleanup->deleteContribution($contribution);

        if ($request->string('decision')->toString() === 'accept') {
            $box->accepted_count++;
        } else {
            $box->rejected_count++;
        }

        $box->last_activity_at = CarbonImmutable::now();
        $box->expires_at = CarbonImmutable::now()->addDays(config()->integer('printopoly.boxes.retention_days'));
        $box->save();

        return response()->json($presenter->owner($box));
    }
}
