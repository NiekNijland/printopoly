<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Actions;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Actions\ResolveContribution;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class ResolveContributionTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_contribution_of_another_box_is_not_found(): void
    {
        $box = CollectionBox::factory()->createOne();
        $elsewhere = BoxContribution::factory()->createOne(['box_id' => CollectionBox::factory()->createOne()->publicId()]);

        $this->expectException(NotFoundHttpException::class);

        resolve(ResolveContribution::class)->handle($box, $elsewhere->publicId(), true, null);
    }

    public function test_a_rejected_contribution_leaves_the_box_and_its_receipt_says_passed(): void
    {
        $box = CollectionBox::factory()->createOne();
        $contribution = BoxContribution::factory()->createOne(['box_id' => $box->publicId(), 'receipt' => 'receipt-rejected']);

        $resolved = resolve(ResolveContribution::class)->handle($box, $contribution->publicId(), false, null);

        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame(['receipt-rejected' => 'passed'], $resolved->outcomes);
        self::assertSame(1, $resolved->rejected_count);
    }

    public function test_an_accepted_name_passes_over_the_same_name_of_another_friend(): void
    {
        $box = CollectionBox::factory()->createOne();
        $accepted = BoxContribution::factory()->createOne(['box_id' => $box->publicId(), 'receipt' => 'receipt-accepted']);
        BoxContribution::factory()->createOne(['box_id' => $box->publicId(), 'receipt' => 'receipt-other']);

        $resolved = resolve(ResolveContribution::class)->handle($box, $accepted->publicId(), true, null);

        self::assertSame(['receipt-accepted' => 'applied', 'receipt-other' => 'passed'], $resolved->outcomes);
        self::assertSame(0, BoxContribution::query()->count());
    }
}
