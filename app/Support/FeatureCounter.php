<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\FeatureEvent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use MongoDB\Laravel\Connection;
use Throwable;

/**
 * The anonymous feature counter (B206): per event and per day one number in the collection `feature_counts`, so a
 * later review can see what people use. No cookie, no address, no edition, no account: only `{event, day, count}`.
 * Counting never gets in the way: a failure is reported and forgotten.
 */
final class FeatureCounter
{
    public const string COLLECTION = 'feature_counts';

    public function count(FeatureEvent $event, int $by = 1): void
    {
        if ($by < 1) {
            return;
        }

        try {
            $connection = DB::connection('mongodb');

            if (! $connection instanceof Connection) {
                return;
            }

            $connection->getCollection(self::COLLECTION)->updateOne(
                ['event' => $event->value, 'day' => CarbonImmutable::now('UTC')->toDateString()],
                ['$inc' => ['count' => $by]],
                ['upsert' => true],
            );
        } catch (Throwable $throwable) {
            report($throwable);
        }
    }
}
