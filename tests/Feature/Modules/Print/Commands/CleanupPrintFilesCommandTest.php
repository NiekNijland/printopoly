<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Commands;

use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Print\Commands\CleanupPrintFilesCommand;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Console\Output\BufferedOutput;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class CleanupPrintFilesCommandTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_it_removes_what_is_past_its_time_and_says_how_much(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        $expired = PrintJob::factory()->createOne(['expires_at' => now()->subMinute()]);
        PrintFile::factory()->createOne(['print_job_id' => $expired->publicId()]);
        Asset::factory()->createOne(['print_job_id' => $expired->publicId()]);
        $kept = PrintJob::factory()->createOne(['expires_at' => now()->addDay()]);
        PrintFile::factory()->createOne(['print_job_id' => $kept->publicId(), 'expires_at' => now()->subMinute()]);
        PrintFile::factory()->createOne(['print_job_id' => $kept->publicId()]);

        $output = new BufferedOutput();
        self::assertSame(0, Artisan::call(CleanupPrintFilesCommand::class, [], $output));
        self::assertSame("Removed 1 jobs, 2 files and 1 photos.\n", $output->fetch());

        self::assertSame([$kept->getKey()], PrintJob::query()->get()->map(static fn (PrintJob $job): mixed => $job->getKey())->all());
        self::assertSame(1, PrintFile::query()->count());
        self::assertSame(0, Asset::query()->count());
    }

    public function test_nothing_to_remove_is_said_as_zero(): void
    {
        PrintJob::factory()->createOne(['expires_at' => now()->addDay()]);

        $output = new BufferedOutput();
        self::assertSame(0, Artisan::call('printopoly:cleanup', [], $output));
        self::assertSame("Removed 0 jobs, 0 files and 0 photos.\n", $output->fetch());

        self::assertSame(1, PrintJob::query()->count());
    }
}
