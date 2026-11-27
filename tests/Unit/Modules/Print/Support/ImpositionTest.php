<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Print\Support;

use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Support\Imposition;
use PHPUnit\Framework\TestCase;

final class ImpositionTest extends TestCase
{
    public function test_cards_turn_an_a4_sheet_sideways_because_twice_as_many_fit(): void
    {
        $plan = Imposition::plan(63.0, 88.0, 3.0, 210.0, 297.0, 10.0, 0.0, 32);

        self::assertSame(297.0, $plan->sheetWidth);
        self::assertSame(210.0, $plan->sheetHeight);
        self::assertSame(4, $plan->sheets);
    }

    public function test_a_forced_portrait_sheet_holds_fewer_cards_so_more_sheets_are_needed(): void
    {
        $plan = Imposition::plan(63.0, 88.0, 3.0, 210.0, 297.0, 10.0, 0.0, 32, 'portrait');

        self::assertSame(210.0, $plan->sheetWidth);
        self::assertSame(297.0, $plan->sheetHeight);
        self::assertSame(8, $plan->sheets);
    }

    public function test_a_forced_landscape_sheet_turns_even_when_portrait_holds_more(): void
    {
        $plan = Imposition::plan(90.0, 130.0, 0.0, 210.0, 297.0, 0.0, 0.0, 7, 'landscape');

        self::assertSame(297.0, $plan->sheetWidth);
        self::assertSame(210.0, $plan->sheetHeight);
        self::assertSame(3, $plan->sheets);
    }

    public function test_on_a_tie_the_sheet_stays_upright(): void
    {
        $plan = Imposition::plan(100.0, 100.0, 0.0, 210.0, 297.0, 0.0, 0.0, 5);

        self::assertSame(210.0, $plan->sheetWidth);
        self::assertSame(297.0, $plan->sheetHeight);
        self::assertSame(2, $plan->sheets);
    }

    public function test_the_gap_between_items_counts_only_between_them(): void
    {
        $withGap = Imposition::plan(60.0, 60.0, 0.0, 200.0, 200.0, 0.0, 10.0, 9);
        $tooWideGap = Imposition::plan(60.0, 60.0, 0.0, 200.0, 200.0, 0.0, 11.0, 9);

        self::assertSame(1, $withGap->sheets);
        self::assertSame(3, $tooWideGap->sheets);
    }

    public function test_items_that_fill_the_sheet_exactly_still_fit_despite_rounding(): void
    {
        $plan = Imposition::plan(63.3, 63.3, 0.0, 189.9, 189.9, 0.0, 0.0, 9);

        self::assertSame(1, $plan->sheets);
    }

    public function test_no_items_need_no_sheets(): void
    {
        self::assertSame(0, Imposition::plan(63.0, 88.0, 3.0, 210.0, 297.0, 10.0, 0.0, 0)->sheets);
    }

    public function test_the_bleed_goes_around_each_item_and_the_margin_on_both_sides_of_the_sheet(): void
    {
        $plan = Imposition::plan(50.0, 50.0, 5.0, 190.0, 250.0, 10.0, 0.0, 8, 'portrait');

        self::assertSame(2, $plan->sheets);
    }

    public function test_a_margin_wider_than_the_sheet_leaves_no_room(): void
    {
        $this->expectException(PrintFailedException::class);

        Imposition::plan(50.0, 50.0, 5.0, 190.0, 250.0, 200.0, 0.0, 1);
    }

    public function test_an_item_larger_than_the_sheet_fails_the_plan(): void
    {
        $this->expectException(PrintFailedException::class);
        $this->expectExceptionMessage('An item does not fit on the sheet.');

        Imposition::plan(300.0, 400.0, 3.0, 210.0, 297.0, 10.0, 0.0, 1);
    }

    public function test_an_item_that_only_fits_the_other_way_fails_when_the_orientation_is_forced(): void
    {
        $this->expectException(PrintFailedException::class);

        Imposition::plan(250.0, 150.0, 0.0, 210.0, 297.0, 0.0, 0.0, 1, 'portrait');
    }
}
