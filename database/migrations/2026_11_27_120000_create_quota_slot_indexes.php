<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use MongoDB\Collection;
use MongoDB\Laravel\Connection;
use MongoDB\Laravel\Schema\Blueprint;

/**
 * The limits on editions per account and on contributions and photos per box hold when two requests add at once:
 * every document takes a slot below the limit, unique within its account or box. Stored documents get their slots
 * here, the lowest free ones of their group.
 */
return new class() extends Migration
{
    /** @var list<array{string, string, string, array<string, mixed>}> collection, group field, slot field, filter */
    private const array QUOTAS = [
        ['editions', 'user_id', 'slot', []],
        ['box_contributions', 'box_id', 'slot', []],
        ['box_contributions', 'box_id', 'photo_slot', ['print_path' => ['$ne' => null]]],
    ];

    public function up(): void
    {
        foreach (self::QUOTAS as [$collection, $group, $slot, $filter]) {
            $this->backfill($this->collection($collection), $group, $slot, $filter);

            Schema::connection('mongodb')->table($collection, function (Blueprint $documents) use ($group, $slot): void {
                $documents->unique([$group => 1, $slot => 1], options: ['partialFilterExpression' => [$slot => ['$exists' => true]]]);
            });
        }
    }

    public function down(): void
    {
        foreach (self::QUOTAS as [$collection, $group, $slot]) {
            Schema::connection('mongodb')->table($collection, function (Blueprint $documents) use ($group, $slot): void {
                $documents->dropIndex($group . '_1_' . $slot . '_1');
            });

            $this->collection($collection)->updateMany([], ['$unset' => [$slot => '']]);
        }
    }

    /**
     * @param array<string, mixed> $filter
     */
    private function backfill(Collection $documents, string $group, string $slot, array $filter): void
    {
        $current = null;
        $members = [];
        $cursor = $documents->find($filter, [
            'sort' => [$group => 1, '_id' => 1],
            'allowDiskUse' => true,
            'projection' => [$group => 1, $slot => 1],
            'typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array'],
        ]);

        foreach ($cursor as $document) {
            if (! is_array($document)) {
                continue;
            }

            if ($current !== ($document[$group] ?? null)) {
                $this->assign($documents, $slot, $members);
                $current = $document[$group] ?? null;
                $members = [];
            }

            $members[] = $document;
        }

        $this->assign($documents, $slot, $members);
    }

    /**
     * @param list<array<mixed>> $members the documents of one group
     */
    private function assign(Collection $documents, string $slot, array $members): void
    {
        $taken = [];
        $next = 0;

        foreach ($members as $member) {
            if (is_int($member[$slot] ?? null)) {
                $taken[$member[$slot]] = true;
            }
        }

        foreach ($members as $member) {
            if (is_int($member[$slot] ?? null)) {
                continue;
            }

            while (isset($taken[$next])) {
                $next++;
            }

            $documents->updateOne(['_id' => $member['_id']], ['$set' => [$slot => $next]]);
            $taken[$next] = true;
        }
    }

    private function collection(string $name): Collection
    {
        $connection = DB::connection('mongodb');
        throw_unless($connection instanceof Connection, LogicException::class, 'The mongodb connection must use the MongoDB Laravel driver.');

        return $connection->getDatabase()->selectCollection($name);
    }
};
