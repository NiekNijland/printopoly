<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Support\Facades\DB;
use LogicException;
use MongoDB\Laravel\Connection;
use MongoDB\Model\IndexInfo;

final class MongoIndexes
{
    /**
     * @return list<array<string, mixed>> the key of every index of the collection, field by field
     */
    public static function keys(string $collection): array
    {
        $keys = [];

        foreach (self::of($collection) as $index) {
            $key = [];

            foreach ($index->getKey() as $field => $order) {
                $key[(string) $field] = $order;
            }

            $keys[] = $key;
        }

        return $keys;
    }

    /**
     * @return list<IndexInfo>
     */
    public static function of(string $collection): array
    {
        $connection = DB::connection('mongodb');
        throw_unless($connection instanceof Connection, LogicException::class, 'The mongodb connection must use the MongoDB Laravel driver.');

        return iterator_to_array($connection->getDatabase()->selectCollection($collection)->listIndexes(), false);
    }
}
