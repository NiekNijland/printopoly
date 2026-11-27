<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Actions;

use App\Models\CollectionBox;
use App\Modules\Boxes\Actions\UpdateBox;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class UpdateBoxTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_null_leaves_the_value_as_it_is(): void
    {
        $box = CollectionBox::factory()->createOne(['edition_name' => 'Zaterdagclub', 'cards_hidden' => false]);

        resolve(UpdateBox::class)->handle($box, true, null, null);

        $stored = $box->refresh();
        self::assertTrue($stored->cards_hidden);
        self::assertSame('Zaterdagclub', $stored->edition_name);
    }

    public function test_the_name_is_cut_and_the_snapshot_cleaned(): void
    {
        $box = CollectionBox::factory()->createOne();

        resolve(UpdateBox::class)->handle($box, null, ['theme' => 'not-a-theme', 'elements' => []], str_repeat('a', 200));

        $stored = $box->refresh();
        self::assertSame(120, mb_strlen($stored->edition_name));
        self::assertSame('classic', $stored->snapshot['theme']);
    }
}
