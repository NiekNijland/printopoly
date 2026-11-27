<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Print\Support;

use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Support\HomeStickerPlan;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class HomeStickerPlanTest extends TestCase
{
    /**
     * @return iterable<string, array{float, float, float, int}>
     */
    public static function boards(): iterable
    {
        yield 'the standard board' => [500.0, 70.0, 0.0, 7];
        yield 'a smaller board with a border' => [450.0, 65.0, 5.0, 6];
        yield 'a small board' => [300.0, 40.0, 0.0, 3];
    }

    #[DataProvider('boards')]
    public function test_the_stickers_of_a_board_fill_this_many_a4_sheets(float $outer, float $corner, float $border, int $sheets): void
    {
        self::assertSame($sheets, HomeStickerPlan::sheets($outer, $corner, $border));
    }

    public function test_a_sticker_larger_than_a_sheet_fails_the_plan(): void
    {
        $this->expectException(PrintFailedException::class);

        HomeStickerPlan::sheets(600.0, 90.0, 0.0);
    }
}
