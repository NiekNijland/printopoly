<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Listeners;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Accounts\Events\AccountDeletingEvent;
use App\Modules\Boxes\Listeners\RemoveAccountBoxes;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class RemoveAccountBoxesTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_boxes_of_a_deleted_account_go_with_what_friends_sent(): void
    {
        $box = CollectionBox::factory()->createOne(['user_id' => 'user-sanne']);
        $kept = CollectionBox::factory()->createOne(['user_id' => 'user-thomas']);
        BoxContribution::factory()->createOne(['box_id' => $box->publicId()]);
        $friend = BoxContribution::factory()->createOne(['box_id' => $kept->publicId()]);

        resolve(RemoveAccountBoxes::class)->handle(new AccountDeletingEvent('user-sanne'));

        self::assertSame([$kept->publicId()], CollectionBox::query()->pluck('id')->all());
        self::assertSame([$friend->publicId()], BoxContribution::query()->pluck('id')->all());
    }
}
