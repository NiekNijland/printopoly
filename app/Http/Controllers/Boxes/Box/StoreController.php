<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Controllers\Controller;
use App\Models\CollectionBox;
use App\Models\User;
use App\Modules\Analytics\Enums\FeatureEvent;
use App\Modules\Analytics\Support\FeatureCounter;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use App\Modules\Boxes\Support\BoxSnapshot;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * "Samen maken": makes the collection box of an edition (B128). It works without an account: the answer carries
 * the owner secret once, which the browser keeps, and only its hash is stored. A logged-in owner also owns the
 * box through the account, and gets the box they already have for that edition instead of a second one.
 */
final class StoreController extends Controller
{
    public function __invoke(Request $request, BoxSnapshot $snapshot, BoxPresenter $presenter): JsonResponse
    {
        $request->validate([
            'editionId' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'editionName' => ['required', 'string', 'max:120'],
            'language' => ['nullable', 'string', 'max:5'],
            'snapshot' => ['present', 'array'],
        ]);

        $editionId = $request->string('editionId')->toString();
        $user = $request->user();
        $userId = $user instanceof User ? $user->publicId() : null;

        if ($userId !== null) {
            $existing = CollectionBox::query()
                ->where('user_id', $userId)
                ->where('edition_id', $editionId)
                ->where('expires_at', '>', now()->toDateTime())
                ->first();

            if ($existing instanceof CollectionBox) {
                return response()->json($presenter->owner($existing));
            }
        } else {
            $this->assertIpLimit($request);
        }

        $secret = Str::random(48);
        $retention = config()->integer('printopoly.boxes.retention_days');
        $box = new CollectionBox([
            'token' => Str::random(40),
            'owner_hash' => BoxAccess::hash($secret),
            'channel' => Str::random(32),
            'user_id' => $userId,
            'edition_id' => $editionId,
            'edition_name' => mb_substr($request->string('editionName')->toString(), 0, 120),
            'language' => BoxSnapshot::language($request->input('language')),
            'snapshot' => $snapshot->clean($request->array('snapshot')),
            'status' => CollectionBox::OPEN,
            'accepted_count' => 0,
            'rejected_count' => 0,
            'ip_hash' => hash_hmac('sha256', (string) $request->ip(), config()->string('app.key')),
            'last_activity_at' => CarbonImmutable::now(),
            'expires_at' => CarbonImmutable::now()->addDays($retention),
        ]);
        $box->save();
        // Anonymous: only that a box was made today (B206).
        resolve(FeatureCounter::class)->count(FeatureEvent::BoxCreated);

        return response()->json([...$presenter->owner($box), 'ownerSecret' => $secret], 201);
    }

    private function assertIpLimit(Request $request): void
    {
        $recent = CollectionBox::query()
            ->where('ip_hash', hash_hmac('sha256', (string) $request->ip(), config()->string('app.key')))
            ->where('created_at', '>', CarbonImmutable::now()->subDay()->toDateTime())
            ->count();

        abort_if($recent >= config()->integer('printopoly.boxes.per_ip_per_day'), 429, __('boxes.too_many_boxes'));
    }
}
