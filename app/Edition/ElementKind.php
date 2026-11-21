<?php

declare(strict_types=1);

namespace App\Edition;

use App\Game\StandardEdition;

/**
 * What an element key is, and which fields it accepts. Mirrors
 * resources/js/lib/edition/keys.ts (B60): keys are fixed strings, never
 * array positions. Amounts stay within 20% of the standard (B132).
 */
enum ElementKind: string
{
    case Space = 'space';
    case Deed = 'deed';
    case Card = 'card';
    case Note = 'note';
    case Pawn = 'pawn';
    case CardBack = 'cardBack';
    case BoxLid = 'boxLid';
    case BoardCenter = 'boardCenter';
    case HouseRules = 'houseRules';
    case RulesBooklet = 'rulesBooklet';
    case FoldModels = 'foldModels';
    case Dice = 'dice';
    case Invitation = 'invitation';
    case Group = 'group';
    case Words = 'words';
    case ThemeAccent = 'themeAccent';

    /** The built-in patterns of card backs; mirrors resources/js/lib/render/patterns.ts. */
    public const array PATTERNS = ['dots', 'stripes', 'checks', 'waves', 'diamonds', 'grid', 'rings', 'confetti'];

    /** Our own icons for special spaces (B136); mirrors SPACE_ICON_PRESETS in resources/js/lib/render/space-icons.ts. */
    public const array SPACE_ICON_PRESETS = ['arrow-left', 'pointer', 'bars', 'car', 'train', 'bulb', 'tap', 'dice', 'chest', 'hand-key', 'window-bars', 'siren', 'handcuffs', 'whistle', 'arrow-bars', 'key', 'padlock', 'bench', 'coffee', 'p-sign', 'flag', 'sun', 'rocket', 'star', 'flame', 'wind-turbine', 'wifi', 'solar-panel', 'tram', 'bus', 'bike', 'ferry', 'coins', 'piggy-bank', 'receipt', 'scales', 'money-bag', 'question', 'question-round', 'clover', 'envelope', 'gift', 'heart'];

    public const int PAWN_COUNT = 8;

    /** A deck holds up to 32 cards: the 16 standard ones and up to 16 extra ones (B135). The same as MAX_DECK_SIZE in keys.ts. */
    public const int MAX_DECK_SIZE = 32;

    /** The words of the game an edition can rename (`words.house`, ...); the bank name is one too (B148). The same as WORD_IDS in keys.ts. */
    public const array WORDS = ['house', 'hotel', 'jail', 'currency', 'chance', 'chest', 'bank'];

    /** Keys older editions still carry, with the key they moved to (B148). The same as LEGACY_KEYS in keys.ts. */
    public const array LEGACY_KEYS = ['bank' => 'words.bank'];

    /**
     * Returns the kind of a valid element key, or null for an invalid key.
     */
    public static function fromKey(string $key, StandardEdition $standard): ?self
    {
        $parts = explode('.', $key);
        $head = $parts[0];
        $second = $parts[1] ?? null;
        $third = $parts[2] ?? null;
        $count = count($parts);

        return match ($head) {
            'space' => $count === 2 && self::twoDigits($second, 0, count($standard->spaces()) - 1) ? self::Space : null,
            'deed' => $count === 2 && self::twoDigits($second, 1, $standard->components()['titleDeeds']) ? self::Deed : null,
            'card' => $count === 3
                && ($second === 'chance' || $second === 'chest')
                && self::twoDigits($third, 1, self::MAX_DECK_SIZE) ? self::Card : null,
            'note' => $count === 2 && self::isNoteValue($second, $standard) ? self::Note : null,
            'pawn' => $count === 2 && self::twoDigits($second, 1, self::PAWN_COUNT) ? self::Pawn : null,
            'card_back' => $count === 2 && in_array($second, ['chance', 'chest', 'deed'], true) ? self::CardBack : null,
            'box_lid' => $count === 1 ? self::BoxLid : null,
            'board_center' => $count === 1 ? self::BoardCenter : null,
            'house_rules' => $count === 1 ? self::HouseRules : null,
            'rules_booklet' => $count === 1 ? self::RulesBooklet : null,
            'fold_models' => $count === 1 ? self::FoldModels : null,
            'dice' => $count === 1 ? self::Dice : null,
            'invitation' => $count === 1 ? self::Invitation : null,
            'theme_accent' => $count === 1 ? self::ThemeAccent : null,
            'group' => $count === 2 && self::isGroup($second, $standard) ? self::Group : null,
            'words' => $count === 2 && in_array($second, self::WORDS, true) ? self::Words : null,
            default => null,
        };
    }

    /**
     * @return list<string>
     */
    public function allowedFields(): array
    {
        return match ($this) {
            self::Space => ['name', 'text', 'amounts', 'photo', 'photoStyle', 'icon', 'deedPhoto'],
            self::Deed => ['name', 'text', 'photo', 'photoStyle'],
            self::Card => ['text', 'amount', 'purpose', 'photo', 'photoStyle', 'added'],
            self::Note => ['photo', 'photoStyle', 'color'],
            self::Pawn => ['name', 'photo', 'photoStyle', 'hidden'],
            self::CardBack => ['photo', 'layers', 'pattern'],
            self::BoxLid => ['name', 'subtitle', 'text', 'photo', 'photoStyle', 'layers', 'titleOffset', 'titleBand'],
            self::BoardCenter => ['name', 'photo', 'layers', 'centerMode', 'subtitle', 'photoAspect', 'photoFrame', 'background', 'titleOffset', 'titleScale', 'titleHidden'],
            self::HouseRules => ['text', 'photo'],
            self::Invitation => ['name', 'subtitle', 'text', 'photo'],
            self::RulesBooklet, self::FoldModels, self::Dice => ['photo'],
            self::Group => ['town', 'color'],
            self::Words => ['name', 'text'],
            self::ThemeAccent => ['color'],
        };
    }

    /**
     * Whether a key is an extra card after the standard ones (B135): `card.chance.17` to `card.chance.32`.
     */
    public static function isExtraCard(string $key, StandardEdition $standard): bool
    {
        if (self::fromKey($key, $standard) !== self::Card) {
            return false;
        }

        return (int) explode('.', $key)[2] > count($standard->deck('chance'));
    }

    private static function isGroup(?string $text, StandardEdition $standard): bool
    {
        if ($text === null) {
            return false;
        }

        return array_any($standard->groups(), fn (array $group): bool => $group['id'] === $text);
    }

    private static function twoDigits(?string $text, int $min, int $max): bool
    {
        if ($text === null || preg_match('/^\d{2}$/', $text) !== 1) {
            return false;
        }

        $number = (int) $text;

        return $number >= $min && $number <= $max;
    }

    private static function isNoteValue(?string $text, StandardEdition $standard): bool
    {
        if ($text === null || preg_match('/^(0|[1-9]\d*)$/', $text) !== 1) {
            return false;
        }

        foreach ($standard->money()['notes'] as $note) {
            if ($note['value'] === (int) $text) {
                return true;
            }
        }

        return false;
    }
}
