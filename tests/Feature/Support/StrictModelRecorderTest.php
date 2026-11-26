<?php

declare(strict_types=1);

namespace Tests\Feature\Support;

use App\Support\StrictModelRecorder;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class StrictModelRecorderTest extends TestCase
{
    public function test_a_violation_is_reported_and_each_key_goes_to_the_file_of_the_worker(): void
    {
        Exceptions::fake([MassAssignmentException::class]);
        $log = $this->freshLog('record');
        $recorder = new StrictModelRecorder($log);
        $recorder->start();

        $recorder->record(new MassAssignmentException('colour, size'), ['App\Models\User discarded-attribute colour', 'App\Models\User discarded-attribute size']);
        $recorder->record(new MassAssignmentException('nothing'), []);

        self::assertSame("App\\Models\\User discarded-attribute colour\nApp\\Models\\User discarded-attribute size\n", file_get_contents($log));
        Exceptions::assertReported(static fn (MassAssignmentException $exception): bool => $exception->getMessage() === 'colour, size');
        Exceptions::assertReported(static fn (MassAssignmentException $exception): bool => $exception->getMessage() === 'nothing');
    }

    public function test_the_file_of_the_worker_exists_before_any_violation_and_a_second_start_keeps_it(): void
    {
        $log = $this->freshLog('start');
        $recorder = new StrictModelRecorder($log);
        $recorder->start();
        $recorder->record(new MassAssignmentException('colour'), ['App\Models\User discarded-attribute colour']);

        new StrictModelRecorder($log)->start();

        self::assertSame("App\\Models\\User discarded-attribute colour\n", file_get_contents($log));
    }

    public function test_outside_a_test_run_a_violation_is_only_reported(): void
    {
        Exceptions::fake([MassAssignmentException::class]);
        $recorder = new StrictModelRecorder(null);

        $recorder->start();
        $recorder->record(new MassAssignmentException('colour'), ['App\Models\User discarded-attribute colour']);

        Exceptions::assertReported(MassAssignmentException::class);
    }

    private function freshLog(string $test): string
    {
        $folder = storage_path('framework/testing/strict-model-recorder-' . $test);
        File::deleteDirectory($folder);

        return $folder . '/worker.log';
    }
}
