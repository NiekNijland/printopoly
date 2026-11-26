<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

/**
 * One row of stickers on an A4 sheet while `HomeStickerPlan` packs them.
 */
final class HomeStickerShelf
{
    public function __construct(
        public readonly float $y,
        public readonly float $height,
        public float $x,
    ) {
    }
}
