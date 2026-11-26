<?php

declare(strict_types=1);

namespace App\Modules\Print\Enums;

/**
 * How the print shop delivers the board (B243): as sticker panels for a board you already have, or as one whole
 * board on a single page at full size with bleed, for foam board, dibond or a poster. At home the board is always
 * stickers per space.
 */
enum BoardForm: string
{
    case Panels = 'panels';
    case Whole = 'whole';
}
