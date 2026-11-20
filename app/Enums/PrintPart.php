<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The parts of an edition that become a PDF (B99). Same names as in
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
            self::Board => str_starts_with($key, 'space.') || $key === 'board_center',
            self::Cards => str_starts_with($key, 'deed.') || str_starts_with($key, 'card.') || str_starts_with($key, 'card_back.') || $key === 'house_rules',
            self::Money => str_starts_with($key, 'note.') || $key === 'bank',
            self::Tokens => str_starts_with($key, 'pawn.'),
            self::BoxLid => $key === 'box_lid',
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
                self::Calibration => 'proefvel',
            },
            Locale::English => match ($this) {
                self::Board => 'board',
                self::Cards => 'cards-and-deeds',
                self::Money => 'play-money',
                self::Tokens => 'tokens',
                self::BoxLid => 'box-lid',
                self::Calibration => 'test-sheet',
            },
        };
    }
}
