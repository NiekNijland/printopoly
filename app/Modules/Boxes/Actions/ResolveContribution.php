<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Actions;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Support\BoxCleanup;
use App\Modules\Boxes\Support\BoxTargets;
use Illuminate\Support\Facades\Config;
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
final readonly class ResolveContribution
{
    public function __construct(
        private BoxCleanup $cleanup,
        private BoxTargets $targets,
    ) {
    }

    /**
     * @param list<string>|null $asked the parts the owner decided about, or null for every part that is still open
     *
     * @throws NotFoundHttpException for a contribution that is not in this box
     */
    public function handle(CollectionBox $box, string $contributionId, bool $accept, ?array $asked): CollectionBox
    {
        $contribution = BoxContribution::query()
            ->where('box_id', $box->publicId())
            ->where('_id', $contributionId)
            ->first();

        throw_unless($contribution instanceof BoxContribution, NotFoundHttpException::class);

        $field = $this->targets->field($contribution->element_key);
        $open = $contribution->openParts($field);
        $parts = $asked !== null ? array_values(array_intersect($open, $asked)) : $open;

        $this->mark($contribution, $parts, $accept ? 'applied' : 'passed');
        $this->settle($box, $contribution, $field);

        if ($accept && $parts !== [] && ! $this->targets->isNewCard($contribution->element_key)) {
            $others = BoxContribution::query()
                ->where('box_id', $box->publicId())
                ->where('element_key', $contribution->element_key)
                ->where('_id', '!=', $contribution->publicId())
                ->get();

            foreach ($others as $other) {
                $this->mark($other, array_values(array_intersect($other->openParts($field), $parts)), 'passed');
                $this->settle($box, $other, $field);
            }
        }

        $box->last_activity_at = now();
        $box->expires_at = now()->addDays(Config::integer('printopoly.boxes.retention_days'));
        $box->save();

        return $box;
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
    private function settle(CollectionBox $box, BoxContribution $contribution, string $field): void
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

        $this->cleanup->deleteContribution($contribution);
    }
}
