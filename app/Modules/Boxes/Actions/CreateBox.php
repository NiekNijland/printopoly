<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Actions;

use App\Models\CollectionBox;
use App\Models\User;
use App\Modules\Analytics\Enums\FeatureEvent;
use App\Modules\Analytics\Support\FeatureCounter;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxSnapshot;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

/**
 * "Samen maken": makes the collection box of an edition (B128). It works without an account: the owner secret goes
 * back once, which the browser keeps, and only its hash is stored. A logged-in owner also owns the box through the
 * account, and gets the box they already have for that edition instead of a second one.
 */
final readonly class CreateBox
{
    public function __construct(
        private BoxSnapshot $snapshots,
        private FeatureCounter $counter,
    ) {
    }

    /**
     * @param array<mixed> $snapshot
     * @return array{box: CollectionBox, secret: string|null} the secret only for a box made now
     */
    public function handle(?User $user, string $editionId, string $editionName, mixed $language, array $snapshot, string $ip): array
    {
        $userId = $user instanceof User ? $user->publicId() : null;
        $ipHash = hash_hmac('sha256', $ip, Config::string('app.key'));

        if ($userId !== null) {
            $existing = CollectionBox::query()
                ->where('user_id', $userId)
                ->where('edition_id', $editionId)
                ->where('expires_at', '>', now()->toDateTime())
                ->first();

            if ($existing instanceof CollectionBox) {
                return ['box' => $existing, 'secret' => null];
            }
        } else {
            $this->assertIpLimit($ipHash);
        }

        $secret = Str::random(48);
        $box = new CollectionBox([
            'token' => Str::random(40),
            'owner_hash' => BoxAccess::hash($secret),
            'channel' => Str::random(32),
            'user_id' => $userId,
            'edition_id' => $editionId,
            'edition_name' => mb_substr($editionName, 0, 120),
            'language' => BoxSnapshot::language($language),
            'snapshot' => $this->snapshots->clean($snapshot),
            'status' => CollectionBox::OPEN,
            'accepted_count' => 0,
            'rejected_count' => 0,
            'ip_hash' => $ipHash,
            'last_activity_at' => now(),
            'expires_at' => now()->addDays(Config::integer('printopoly.boxes.retention_days')),
        ]);
        $box->save();

        // Anonymous: only that a box was made today (B206).
        $this->counter->count(FeatureEvent::BOX_CREATED);

        return ['box' => $box, 'secret' => $secret];
    }

    private function assertIpLimit(string $ipHash): void
    {
        $recent = CollectionBox::query()
            ->where('ip_hash', $ipHash)
            ->where('created_at', '>', now()->subDay()->toDateTime())
            ->count();

        if ($recent >= Config::integer('printopoly.boxes.per_ip_per_day')) {
            throw new TooManyRequestsHttpException(null, __('boxes.too_many_boxes'));
        }
    }
}
