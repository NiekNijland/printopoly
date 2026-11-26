<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Models\Asset;
use App\Models\PrintFile;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

/**
 * Production runs on the private R2 disk (B68): every upload, crop, PDF and the
 * cleanup must use the disk from `printopoly.storage.disk`, never `local`.
 */
final class ConfiguredDiskTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_uploads_pdfs_and_cleanup_use_the_configured_disk_only(): void
    {
        Storage::fake('r2');
        config(['printopoly.storage.disk' => 'r2']);

        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        self::assertCount(5, Storage::disk('r2')->allFiles(), 'preview, print source, PDF, instructions and order sheet');
        self::assertSame([], Storage::disk('local')->allFiles(), 'nothing is written to the local disk');
        self::assertSame(['r2'], Asset::query()->pluck('disk')->unique()->values()->all());
        self::assertSame(['r2'], PrintFile::query()->pluck('disk')->unique()->values()->all());

        $job->forceFill(['expires_at' => CarbonImmutable::now()->subMinute()])->save();
        self::assertSame(0, Artisan::call('printopoly:cleanup'));

        self::assertSame([], Storage::disk('r2')->allFiles(), 'the cleanup deletes from the configured disk');
    }

    public function test_the_r2_disk_is_a_private_path_style_s3_disk(): void
    {
        $disk = config()->array('filesystems.disks.r2');

        self::assertSame('s3', $disk['driver']);
        self::assertSame('private', $disk['visibility']);
        self::assertTrue($disk['use_path_style_endpoint']);
        self::assertArrayNotHasKey('url', $disk);
    }
}
