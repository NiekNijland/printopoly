<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Support;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Data\BoxContributionData;
use App\Modules\Boxes\Support\BoxPresenter;
use MongoDB\BSON\ObjectId;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class BoxPresenterTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_owner_sees_contributions_of_the_same_moment_in_the_order_of_their_id(): void
    {
        $box = CollectionBox::factory()->createOne();
        $later = new ObjectId('6500000000000000000000b2');
        $earlier = new ObjectId('6500000000000000000000a1');
        BoxContribution::factory()->createOne(['_id' => $later, 'box_id' => $box->publicId(), 'value' => 'second']);
        BoxContribution::factory()->createOne(['_id' => $earlier, 'box_id' => $box->publicId(), 'value' => 'first']);

        $contributions = $this->app->make(BoxPresenter::class)->owner($box)->contributions;

        self::assertSame(['first', 'second'], array_map(static fn (BoxContributionData $contribution): ?string => $contribution->value, $contributions));
    }
}
