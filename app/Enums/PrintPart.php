<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The parts of an edition that become a PDF (B99). The dice and the houses and hotels are gone (B200): a stored
 * job that still names them reads them as unknown and leaves them out. Same names as in
 * resources/js/lib/print/composition.ts. The test sheet is a row of its own
 * and never ends up in a production PDF (B95).
 */
enum PrintPart: string
{
    case Board = 'board';
    case Cards = 'cards';
    case Money = 'money';
    case Tokens = 'tokens';
    case BoxLid = 'box_lid';
    case RulesBooklet = 'rules_booklet';
    case Invitation = 'invitation';
    case Calibration = 'calibration';

    /**
     * @return list<self>
     */
    public static function production(): array
    {
        return array_values(array_filter(self::cases(), static fn (self $part): bool => $part !== self::Calibration));
    }

    /**
     * Whether an edition element (B60 key) is drawn on this part. A change to
     * an element of another part does not make this part outdated (B95).
     */
    public function ownsElement(string $key): bool
    {
        return match ($this) {
            self::Board => str_starts_with($key, 'space.') || str_starts_with($key, 'group.') || $key === 'board_center' || str_starts_with($key, 'words.') || $key === 'theme_accent',
            self::Cards => str_starts_with($key, 'deed.') || str_starts_with($key, 'group.') || str_starts_with($key, 'card.') || str_starts_with($key, 'card_back.') || $key === 'house_rules' || str_starts_with($key, 'words.') || $key === 'theme_accent',
            self::Money => str_starts_with($key, 'note.') || str_starts_with($key, 'words.') || $key === 'theme_accent',
            self::Tokens => str_starts_with($key, 'pawn.') || $key === 'theme_accent',
            self::BoxLid => $key === 'box_lid' || $key === 'theme_accent',
            self::RulesBooklet => $key === 'rules_booklet' || $key === 'house_rules' || str_starts_with($key, 'group.') || str_starts_with($key, 'words.') || $key === 'theme_accent',
            // The invitation shows the real board (bug 5 of ronde 3): spaces, colours and the centre with its photo.
            self::Invitation => $key === 'invitation' || str_starts_with($key, 'space.') || str_starts_with($key, 'group.') || $key === 'board_center' || str_starts_with($key, 'words.') || $key === 'theme_accent',
            self::Calibration => false,
        };
    }

    /**
     * File name of the instruction text in resources/content/{locale}/instructies (B64).
     */
    public function instructionSlug(): string
    {
        return match ($this) {
            self::Board => 'bord',
            self::Cards => 'kaarten',
            self::Money => 'geld',
            self::Tokens => 'pionnen',
            self::BoxLid => 'doosdeksel',
            self::RulesBooklet => 'spelregelboekje',
            self::Invitation => 'uitnodiging',
            self::Calibration => 'proefvel',
        };
    }

    /**
     * A name safe for file names.
     */
    public function fileName(Locale $locale): string
    {
        return match ($locale) {
            Locale::Dutch => match ($this) {
                self::Board => 'bord',
                self::Cards => 'kaarten-en-eigendomsbewijzen',
                self::Money => 'speelgeld',
                self::Tokens => 'pionnen',
                self::BoxLid => 'doosdeksel',
                self::RulesBooklet => 'spelregelboekje',
                self::Invitation => 'uitnodiging',
                self::Calibration => 'proefvel',
            },
            Locale::English => match ($this) {
                self::Board => 'board',
                self::Cards => 'cards-and-deeds',
                self::Money => 'play-money',
                self::Tokens => 'tokens',
                self::BoxLid => 'box-lid',
                self::RulesBooklet => 'rules-booklet',
                self::Invitation => 'invitation',
                self::Calibration => 'test-sheet',
            },
        };
    }
}
