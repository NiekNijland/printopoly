<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Listeners;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Listeners\RemoveEditionBoxes;
use App\Modules\Editions\Events\EditionDeletedEvent;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class RemoveEditionBoxesTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_boxes_of_a_deleted_edition_go_and_the_other_editions_keep_theirs(): void
    {
        $box = CollectionBox::factory()->createOne(['user_id' => 'user-sanne', 'edition_id' => 'e1']);
        $kept = CollectionBox::factory()->createOne(['user_id' => 'user-sanne', 'edition_id' => 'e2']);
        BoxContribution::factory()->createOne(['box_id' => $box->publicId()]);

        resolve(RemoveEditionBoxes::class)->handle(new EditionDeletedEvent('user-sanne', 'e1'));

        self::assertSame([$kept->publicId()], CollectionBox::query()->pluck('id')->all());
        self::assertSame(0, BoxContribution::query()->count());
    }
}
