<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Contribution;

use App\Http\Controllers\Controller;
use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxCleanup;
use App\Modules\Boxes\Support\BoxPresenter;
use App\Modules\Boxes\Support\BoxTargets;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The owner has decided about a contribution (B128), or about one part of it (B175): the name, text or town, the
 * photo or the amount. The browser applies an accepted part to the local edition first (the photo goes into
 * IndexedDB) and then tells the server.
 *
 * Applying a part passes over the same part of every other contribution for that element: two names for one space
 * cannot both go in. A contribution with no open part left is deleted together with its photo, and the box keeps
 * for the friend whether something of it went in (`applied`) or not (`passed`).
 */
final class ResolveController extends Controller
{
    private const array PARTS = ['name', 'text', 'town', 'photo', 'amount'];

    public function __invoke(Request $request, string $boxId, string $contributionId, BoxAccess $access, BoxCleanup $cleanup, BoxPresenter $presenter, BoxTargets $targets): JsonResponse
    {
        $box = $access->owned($request, $boxId);
        $request->validate([
            'decision' => ['required', 'in:accept,reject'],
            'parts' => ['nullable', 'array'],
            'parts.*' => ['string', 'in:' . implode(',', self::PARTS)],
        ]);

        $contribution = BoxContribution::query()
            ->where('box_id', $box->publicId())
            ->where('_id', $contributionId)
            ->first();

        throw_unless($contribution instanceof BoxContribution, NotFoundHttpException::class);

        $field = $targets->field($contribution->element_key);
        $open = $contribution->openParts($field);
        $asked = array_filter($request->array('parts'), is_string(...));
        $parts = $request->has('parts')
            ? array_values(array_intersect($open, $asked))
            : $open;
        $accept = $request->string('decision')->toString() === 'accept';

        $this->mark($contribution, $parts, $accept ? 'applied' : 'passed');
        $this->settle($box, $contribution, $field, $cleanup);

        if ($accept && $parts !== [] && ! $targets->isNewCard($contribution->element_key)) {
            $others = BoxContribution::query()
                ->where('box_id', $box->publicId())
                ->where('element_key', $contribution->element_key)
                ->where('_id', '!=', $contribution->publicId())
                ->get();

            foreach ($others as $other) {
                $this->mark($other, array_values(array_intersect($other->openParts($field), $parts)), 'passed');
                $this->settle($box, $other, $field, $cleanup);
            }
        }

        $box->last_activity_at = CarbonImmutable::now();
        $box->expires_at = CarbonImmutable::now()->addDays(config()->integer('printopoly.boxes.retention_days'));
        $box->save();

        return response()->json($presenter->owner($box));
    }

    /**
     * @param list<string> $parts
     */
    private function mark(BoxContribution $contribution, array $parts, string $how): void
    {
        if ($parts === []) {
            return;
        }

        $handled = $contribution->handled ?? [];

        foreach ($parts as $part) {
            $handled[$part] = $how;
        }

        $contribution->handled = $handled;
    }

    /**
     * Saves a contribution that still has something open; deletes one that has not and counts it.
     */
    private function settle(CollectionBox $box, BoxContribution $contribution, string $field, BoxCleanup $cleanup): void
    {
        if ($contribution->openParts($field) !== []) {
            if ($contribution->isDirty()) {
                $contribution->save();
            }

            return;
        }

        $applied = in_array('applied', $contribution->handled ?? [], true);
        $outcomes = $box->outcomes ?? [];
        $outcomes[$contribution->receipt] = $applied ? 'applied' : 'passed';
        // The friend's browser asks with at most 50 receipts; keep the newest few hundred.
        $box->outcomes = array_slice($outcomes, -400, null, true);

        if ($applied) {
            $box->accepted_count++;
        } else {
            $box->rejected_count++;
        }

        $cleanup->deleteContribution($contribution);
    }
}
