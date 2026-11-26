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
    case EditionCreated = 'edition_created';
    case TemplateChosen = 'template_chosen';
    case PhotoAdded = 'photo_added';
    case ShareImageMade = 'share_image_made';
    case BoxCreated = 'box_created';
    case PrintBoard = 'print_board';
    case PrintCards = 'print_cards';
    case PrintMoney = 'print_money';
    case PrintTokens = 'print_tokens';
    case PrintBoxLid = 'print_box_lid';
    case PrintRulesBooklet = 'print_rules_booklet';
    case PrintInvitation = 'print_invitation';
    case PrintCalibration = 'print_calibration';

    /**
     * The events that happen in the browser only: an edition and its photos live there (B80).
     *
     * @return list<self>
     */
    public static function fromBrowser(): array
    {
        return [self::EditionCreated, self::TemplateChosen, self::PhotoAdded];
    }

    /**
     * The event of a part made for a print set.
     */
    public static function printed(PrintPart $part): self
    {
        return match ($part) {
            PrintPart::Board => self::PrintBoard,
            PrintPart::Cards => self::PrintCards,
            PrintPart::Money => self::PrintMoney,
            PrintPart::Tokens => self::PrintTokens,
            PrintPart::BoxLid => self::PrintBoxLid,
            PrintPart::RulesBooklet => self::PrintRulesBooklet,
            PrintPart::Invitation => self::PrintInvitation,
            PrintPart::Calibration => self::PrintCalibration,
        };
    }
}
