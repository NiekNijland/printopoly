<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Listeners;

use App\Models\Asset;
use App\Modules\Editions\Events\EditionDuplicatedEvent;
use App\Modules\Editions\Listeners\CopyEditionAssets;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class CopyEditionAssetsTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_copy_gets_its_own_files_under_the_same_photo_ids(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('assets/molen/preview.webp', 'voorbeeld');
        Storage::disk('local')->put('assets/molen/print.png', 'drukwerk');
        Asset::factory()->createOne([
            'ref' => 'molen', 'user_id' => 'sanne', 'edition_id' => 'origineel',
            'preview_path' => 'assets/molen/preview.webp', 'print_path' => 'assets/molen/print.png',
            'width' => 640, 'height' => 480, 'checksum' => 'molen-sum',
        ]);
        Asset::factory()->createOne(['ref' => 'vreemd', 'user_id' => 'bram', 'edition_id' => 'origineel']);

        new CopyEditionAssets()->handle(new EditionDuplicatedEvent('sanne', 'origineel', 'kopie'));

        $copy = Asset::query()->where('edition_id', 'kopie')->sole();
        self::assertSame('molen', $copy->ref);
        self::assertSame('sanne', $copy->user_id);
        self::assertSame(640, $copy->width);
        self::assertSame('molen-sum', $copy->checksum);
        self::assertNotSame('assets/molen/print.png', $copy->print_path);
        self::assertStringEndsWith('/print.png', $copy->print_path);
        self::assertStringEndsWith('/preview.webp', $copy->preview_path);
        self::assertSame('drukwerk', Storage::disk('local')->get($copy->print_path));
        self::assertSame('voorbeeld', Storage::disk('local')->get($copy->preview_path));
        self::assertTrue(Storage::disk('local')->exists('assets/molen/print.png'));
        self::assertSame(3, Asset::query()->count());
    }

    public function test_a_jpeg_print_stays_a_jpeg_and_an_edition_without_photos_copies_nothing(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('assets/a/preview.webp', 'v');
        Storage::disk('local')->put('assets/a/print.jpg', 'p');
        Asset::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'met-foto', 'preview_path' => 'assets/a/preview.webp', 'print_path' => 'assets/a/print.jpg']);

        new CopyEditionAssets()->handle(new EditionDuplicatedEvent('sanne', 'met-foto', 'kopie'));
        new CopyEditionAssets()->handle(new EditionDuplicatedEvent('sanne', 'zonder-foto', 'leeg'));

        self::assertStringEndsWith('/print.jpg', Asset::query()->where('edition_id', 'kopie')->sole()->print_path);
        self::assertSame(0, Asset::query()->where('edition_id', 'leeg')->count());
    }
}
