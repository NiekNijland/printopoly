<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Listeners;

use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Editions\Events\EditionDeletedEvent;
use App\Modules\Print\Listeners\RemoveEditionPrintData;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class RemoveEditionPrintDataTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_job_pdfs_and_photos_of_the_edition_go_and_other_editions_stay(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        $job = PrintJob::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'zaterdagclub']);
        PrintFile::factory()->createOne(['print_job_id' => $job->publicId(), 'path' => 'print/zaterdagclub.pdf']);
        Storage::disk('local')->put('print/zaterdagclub.pdf', 'pdf');
        Asset::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'zaterdagclub', 'preview_path' => 'assets/molenweg.webp', 'print_path' => 'assets/molenweg.jpg']);
        Storage::disk('local')->put('assets/molenweg.jpg', 'foto');
        $kept = PrintJob::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'kerkstraat']);
        $sameIdOfBob = PrintJob::factory()->createOne(['user_id' => 'user-bob', 'edition_id' => 'zaterdagclub']);
        Asset::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'kerkstraat']);

        resolve(RemoveEditionPrintData::class)->handle(new EditionDeletedEvent('user-anna', 'zaterdagclub'));

        self::assertNull(PrintJob::query()->find($job->getKey()));
        self::assertNotNull(PrintJob::query()->find($kept->getKey()));
        self::assertNotNull(PrintJob::query()->find($sameIdOfBob->getKey()));
        self::assertSame(0, PrintFile::query()->count());
        self::assertSame(['kerkstraat'], Asset::query()->pluck('edition_id')->all());
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_the_listener_hears_the_deletion_of_an_edition(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        $job = PrintJob::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'zaterdagclub']);

        Event::dispatch(new EditionDeletedEvent('user-anna', 'zaterdagclub'));

        self::assertNull(PrintJob::query()->find($job->getKey()));
    }
}
