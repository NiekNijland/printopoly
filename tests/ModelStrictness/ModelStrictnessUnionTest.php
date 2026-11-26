<?php

declare(strict_types=1);

namespace Tests\ModelStrictness;

use PHPUnit\Framework\TestCase;
use Tests\Support\CountedList;

final class ModelStrictnessUnionTest extends TestCase
{
    private const string LIST = 'tests/ModelStrictness/model-strictness-violations.txt';

    public function test_the_suite_records_only_the_listed_strict_model_violations(): void
    {
        $root = dirname(__DIR__, 2);
        $logs = glob($root . '/storage/logs/model-strictness-*.log');
        $logs = $logs === false ? [] : $logs;

        self::assertNotEmpty($logs, 'storage/logs holds no model-strictness-<worker>.log: the recorder of the strict models never ran. Run the suite through composer test:unit, which empties the record first and checks it last.');

        $keys = [];

        foreach ($logs as $log) {
            array_push($keys, ...array_filter(explode("\n", (string) file_get_contents($log)), static fn (string $line): bool => $line !== ''));
        }

        $differences = new CountedList($root . '/' . self::LIST)->differences(array_values(array_unique($keys)));

        self::assertSame([], $differences, implode("\n", $differences) . "\nA strict-model violation is fixed at the query: with() or load(), the attribute made fillable, or forceFill().");
    }
}
