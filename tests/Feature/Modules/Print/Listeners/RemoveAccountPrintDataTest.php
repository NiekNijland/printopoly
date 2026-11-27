<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Listeners;

use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Accounts\Events\AccountDeletingEvent;
use App\Modules\Print\Listeners\RemoveAccountPrintData;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class RemoveAccountPrintDataTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_every_job_pdf_and_photo_of_the_account_goes_and_the_rest_stays(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        $job = PrintJob::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'zaterdagclub']);
        PrintFile::factory()->createOne(['print_job_id' => $job->publicId(), 'path' => 'print/anna-kaarten.pdf']);
        Storage::disk('local')->put('print/anna-kaarten.pdf', 'pdf');
        Asset::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'molenweg', 'preview_path' => 'assets/anna.webp', 'print_path' => 'assets/anna.jpg']);
        Storage::disk('local')->put('assets/anna.webp', 'foto');
        $other = PrintJob::factory()->createOne(['user_id' => 'user-bob', 'edition_id' => 'zaterdagclub']);
        PrintFile::factory()->createOne(['print_job_id' => $other->publicId(), 'path' => 'print/bob-kaarten.pdf']);
        Storage::disk('local')->put('print/bob-kaarten.pdf', 'pdf');
        Asset::factory()->createOne(['user_id' => 'user-bob']);

        resolve(RemoveAccountPrintData::class)->handle(new AccountDeletingEvent('user-anna'));

        self::assertSame([$other->getKey()], PrintJob::query()->get()->map(static fn (PrintJob $kept): mixed => $kept->getKey())->all());
        self::assertSame(['print/bob-kaarten.pdf'], PrintFile::query()->pluck('path')->all());
        self::assertSame(['user-bob'], Asset::query()->pluck('user_id')->all());
        self::assertSame(['print/bob-kaarten.pdf'], Storage::disk('local')->allFiles());
    }

    public function test_the_listener_hears_the_deletion_of_an_account(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        $job = PrintJob::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'zaterdagclub']);

        event(new AccountDeletingEvent('user-anna'));

        self::assertNull(PrintJob::query()->find($job->getKey()));
    }
}
