<?php

declare(strict_types=1);

namespace App\Modules\Print\Enums;

/**
 * How much play money a set prints (B156). The counts are the same as NOTE_COUNTS in
 * resources/js/lib/render/print-money.ts: the browser lays out the notes and the PDF check counts them.
 */
enum MoneyAmount: string
{
    /**
     * Enough for the starting split of 2 to 4 players, with a small bank.
     */
    case Four = 'four';

    /**
     * Enough for the starting split of 8 players.
     */
    case Eight = 'eight';

    /**
     * At least the 30 of each value of the original game, on top of the split of 8.
     */
    case Full = 'full';

    /**
     * Without a choice: 2 to 4 players at home, the full bank at the print shop.
     */
    public static function defaultFor(PrintSet $set): self
    {
        return $set === PrintSet::Home ? self::Four : self::Full;
    }

    /**
     * Notes per value.
     *
     * @return array<int, int>
     */
    public function counts(): array
    {
        return match ($this) {
            self::Four => [1 => 24, 5 => 24, 10 => 24, 20 => 30, 50 => 12, 100 => 18, 500 => 12],
            self::Eight => [1 => 42, 5 => 42, 10 => 42, 20 => 54, 50 => 24, 100 => 30, 500 => 24],
            self::Full => [1 => 48, 5 => 48, 10 => 48, 20 => 60, 50 => 30, 100 => 42, 500 => 30],
        };
    }

    public function total(): int
    {
        return array_sum($this->counts());
    }

    /**
     * The most players the amount is meant for.
     */
    public function maxPlayers(): int
    {
        return $this === self::Four ? 4 : 8;
    }
}
