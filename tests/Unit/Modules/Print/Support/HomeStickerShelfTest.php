<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Print\Support;

use App\Modules\Print\Support\HomeStickerShelf;
use PHPUnit\Framework\TestCase;

final class HomeStickerShelfTest extends TestCase
{
    public function test_a_shelf_keeps_its_row_and_height(): void
    {
        $shelf = new HomeStickerShelf(y: 12.5, height: 70.0, x: 8.0);

        self::assertSame(12.5, $shelf->y);
        self::assertSame(70.0, $shelf->height);
        self::assertSame(8.0, $shelf->x);
    }

    public function test_the_next_free_spot_on_a_shelf_moves_to_the_right_as_stickers_go_on(): void
    {
        $shelf = new HomeStickerShelf(y: 10.0, height: 46.0, x: 10.0);

        $shelf->x += 76.0;
        $shelf->x += 76.0;

        self::assertSame(162.0, $shelf->x);
        self::assertSame(10.0, $shelf->y);
    }
}
