<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Actions;

use App\Models\CollectionBox;
use App\Modules\Boxes\Actions\CloseBox;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class CloseBoxTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_closed_box_keeps_its_link(): void
    {
        $box = CollectionBox::factory()->createOne(['token' => 'box-token-keep']);

        resolve(CloseBox::class)->handle($box);

        $stored = $box->refresh();
        self::assertSame(CollectionBox::CLOSED, $stored->status);
        self::assertSame('box-token-keep', $stored->token);
    }
}
