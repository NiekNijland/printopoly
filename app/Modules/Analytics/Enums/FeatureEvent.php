<?php

declare(strict_types=1);

namespace App\Modules\Analytics\Enums;

use App\Modules\Print\Enums\PrintPart;

/**
 * What the anonymous feature counter counts (B206): one counter per event per day, nothing else. The browser may
 * only send the events in `fromBrowser()`; the server counts the rest itself. The same names as `FeatureEvent` in
 * resources/js/lib/feature-count.ts.
 */
enum FeatureEvent: string
{
    case EDITION_CREATED = 'edition_created';
    case TEMPLATE_CHOSEN = 'template_chosen';
    case PHOTO_ADDED = 'photo_added';
    case SHARE_IMAGE_MADE = 'share_image_made';
    case BOX_CREATED = 'box_created';
    case PRINT_BOARD = 'print_board';
    case PRINT_CARDS = 'print_cards';
    case PRINT_MONEY = 'print_money';
    case PRINT_TOKENS = 'print_tokens';
    case PRINT_BOX_LID = 'print_box_lid';
    case PRINT_RULES_BOOKLET = 'print_rules_booklet';
    case PRINT_INVITATION = 'print_invitation';
    case PRINT_CALIBRATION = 'print_calibration';

    /**
     * The events that happen in the browser only: an edition and its photos live there (B80).
     *
     * @return list<self>
     */
    public static function fromBrowser(): array
    {
        return [self::EDITION_CREATED, self::TEMPLATE_CHOSEN, self::PHOTO_ADDED];
    }

    /**
     * The event of a part made for a print set.
     */
    public static function printed(PrintPart $part): self
    {
        return match ($part) {
            PrintPart::BOARD => self::PRINT_BOARD,
            PrintPart::CARDS => self::PRINT_CARDS,
            PrintPart::MONEY => self::PRINT_MONEY,
            PrintPart::TOKENS => self::PRINT_TOKENS,
            PrintPart::BOX_LID => self::PRINT_BOX_LID,
            PrintPart::RULES_BOOKLET => self::PRINT_RULES_BOOKLET,
            PrintPart::INVITATION => self::PRINT_INVITATION,
            PrintPart::CALIBRATION => self::PRINT_CALIBRATION,
        };
    }
}
