<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Support;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Support\BoxCleanup;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\TestCase;

final class BoxCleanupTest extends TestCase
{
    use RefreshesMongoDatabase;
    use UsesLocalBoxDisk;

    public function test_a_run_removes_expired_boxes_with_their_photos_and_keeps_live_ones(): void
    {
        $expired = CollectionBox::factory()->createOne(['expires_at' => now()->subMinute()->toImmutable()]);
        $live = CollectionBox::factory()->createOne();
        $photo = $this->photoContribution($expired, 'box-photos/oud');
        BoxContribution::factory()->createOne(['box_id' => $expired->publicId()]);
        $kept = BoxContribution::factory()->createOne(['box_id' => $live->publicId()]);

        $counts = resolve(BoxCleanup::class)->run();

        self::assertSame(['boxes' => 1, 'contributions' => 2], $counts);
        self::assertNull(CollectionBox::query()->find($expired->publicId()));
        self::assertNull(BoxContribution::query()->find($photo->publicId()));
        self::assertNotNull(CollectionBox::query()->find($live->publicId()));
        self::assertNotNull(BoxContribution::query()->find($kept->publicId()));
        Storage::disk('local')->assertMissing(['box-photos/oud/preview.webp', 'box-photos/oud/print.jpg']);
    }

    public function test_a_run_removes_contributions_whose_box_is_already_gone(): void
    {
        $orphan = BoxContribution::factory()->createOne(['box_id' => 'aaaaaaaaaaaaaaaaaaaaaaaa']);

        $counts = resolve(BoxCleanup::class)->run();

        self::assertSame(['boxes' => 0, 'contributions' => 1], $counts);
        self::assertNull(BoxContribution::query()->find($orphan->publicId()));
    }

    public function test_a_run_with_nothing_expired_removes_nothing(): void
    {
        $box = CollectionBox::factory()->createOne();
        BoxContribution::factory()->createOne(['box_id' => $box->publicId()]);

        self::assertSame(['boxes' => 0, 'contributions' => 0], resolve(BoxCleanup::class)->run());
        self::assertSame(1, BoxContribution::query()->count());
    }

    public function test_deleting_a_box_returns_how_many_contributions_went_with_it(): void
    {
        $box = CollectionBox::factory()->createOne();
        $this->photoContribution($box, 'box-photos/molen');
        BoxContribution::factory()->createOne(['box_id' => $box->publicId()]);
        $other = BoxContribution::factory()->createOne();

        self::assertSame(2, resolve(BoxCleanup::class)->deleteBox($box));
        self::assertSame(0, CollectionBox::query()->count());
        self::assertSame([$other->publicId()], BoxContribution::query()->pluck('id')->all());
        Storage::disk('local')->assertMissing('box-photos/molen/print.jpg');
    }

    public function test_a_contribution_without_a_photo_is_deleted_without_touching_the_disk(): void
    {
        Storage::disk('local')->put('box-photos/ander/print.jpg', 'foto');
        $contribution = BoxContribution::factory()->createOne();

        resolve(BoxCleanup::class)->deleteContribution($contribution);

        self::assertSame(0, BoxContribution::query()->count());
        Storage::disk('local')->assertExists('box-photos/ander/print.jpg');
    }

    public function test_an_edition_takes_only_its_own_boxes_of_that_account(): void
    {
        $gone = CollectionBox::factory()->createOne(['user_id' => 'user-sanne', 'edition_id' => 'e1']);
        $otherEdition = CollectionBox::factory()->createOne(['user_id' => 'user-sanne', 'edition_id' => 'e2']);
        $otherUser = CollectionBox::factory()->createOne(['user_id' => 'user-thomas', 'edition_id' => 'e1']);
        BoxContribution::factory()->createOne(['box_id' => $gone->publicId()]);

        resolve(BoxCleanup::class)->deleteForEdition('user-sanne', 'e1');

        self::assertSame([$otherEdition->publicId(), $otherUser->publicId()], CollectionBox::query()->orderBy('edition_id', 'desc')->pluck('id')->all());
        self::assertSame(0, BoxContribution::query()->count());
    }

    public function test_an_account_takes_all_its_boxes(): void
    {
        CollectionBox::factory()->createOne(['user_id' => 'user-sanne', 'edition_id' => 'e1']);
        CollectionBox::factory()->createOne(['user_id' => 'user-sanne', 'edition_id' => 'e2']);
        $kept = CollectionBox::factory()->createOne(['user_id' => 'user-thomas']);

        resolve(BoxCleanup::class)->deleteForUser('user-sanne');

        self::assertSame([$kept->publicId()], CollectionBox::query()->pluck('id')->all());
    }

    public function test_a_run_removes_every_expired_box_and_orphan_past_one_page_and_keeps_the_rest(): void
    {
        $live = CollectionBox::factory()->createOne();
        $kept = BoxContribution::factory()->createOne(['box_id' => $live->publicId()]);

        foreach (range(1, 120) as $index) {
            $box = CollectionBox::factory()->createOne(['expires_at' => now()->subMinutes($index)->toImmutable()]);
            BoxContribution::factory()->createOne(['box_id' => $box->publicId()]);
            BoxContribution::factory()->createOne(['box_id' => str_pad(dechex($index), 24, 'b', STR_PAD_LEFT)]);
        }

        self::assertSame(['boxes' => 120, 'contributions' => 240], resolve(BoxCleanup::class)->run());
        self::assertSame([$live->publicId()], CollectionBox::query()->pluck('id')->all());
        self::assertSame([$kept->publicId()], BoxContribution::query()->pluck('id')->all());
    }

    public function test_an_account_takes_the_contributions_and_photos_of_all_its_boxes(): void
    {
        $first = CollectionBox::factory()->createOne(['user_id' => 'user-sanne', 'edition_id' => 'e1']);
        $second = CollectionBox::factory()->createOne(['user_id' => 'user-sanne', 'edition_id' => 'e2']);
        $other = CollectionBox::factory()->createOne(['user_id' => 'user-thomas']);
        $this->photoContribution($first, 'box-photos/eerste');
        BoxContribution::factory()->createOne(['box_id' => $second->publicId()]);
        $kept = BoxContribution::factory()->createOne(['box_id' => $other->publicId()]);

        resolve(BoxCleanup::class)->deleteForUser('user-sanne');

        self::assertSame([$kept->publicId()], BoxContribution::query()->pluck('id')->all());
        Storage::disk('local')->assertMissing(['box-photos/eerste/preview.webp', 'box-photos/eerste/print.jpg']);
    }

    private function photoContribution(CollectionBox $box, string $folder): BoxContribution
    {
        Storage::disk('local')->put($folder . '/preview.webp', 'voorbeeld');
        Storage::disk('local')->put($folder . '/print.jpg', 'foto');

        return BoxContribution::factory()->createOne([
            'box_id' => $box->publicId(),
            'disk' => 'local',
            'preview_path' => $folder . '/preview.webp',
            'print_path' => $folder . '/print.jpg',
        ]);
    }
}
