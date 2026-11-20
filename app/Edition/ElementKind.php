<?php

declare(strict_types=1);

namespace App\Edition;

use App\Game\StandardEdition;

/**
 * What an element key is, and which fields it accepts. Mirrors
 * resources/js/lib/edition/keys.ts (B60): keys are fixed strings, never
 * array positions. Amounts only exist on cards (B29, B32, B58).
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
    case Bank = 'bank';
    case Group = 'group';

    public const int PAWN_COUNT = 8;

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
                && self::twoDigits($third, 1, count($standard->deck('chance'))) ? self::Card : null,
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
            'bank' => $count === 1 ? self::Bank : null,
            'group' => $count === 2 && self::isGroup($second, $standard) ? self::Group : null,
            default => null,
        };
    }

    /**
     * @return list<string>
     */
    public function allowedFields(): array
    {
        return match ($this) {
            self::Space, self::Deed => ['name', 'photo', 'photoStyle'],
            self::Card => ['text', 'amount', 'photo', 'photoStyle'],
            self::Note => ['photo', 'photoStyle', 'color'],
            self::Pawn => ['name', 'photo', 'photoStyle', 'hidden'],
            self::CardBack => ['photo', 'layers'],
            self::BoxLid => ['name', 'photo', 'photoStyle', 'layers'],
            self::BoardCenter => ['name', 'photo', 'layers', 'centerMode', 'subtitle', 'photoAspect', 'photoFrame', 'background'],
            self::HouseRules, self::Invitation => ['text', 'photo'],
            self::RulesBooklet, self::FoldModels, self::Dice => ['photo'],
            self::Bank => ['name'],
            self::Group => ['town'],
        };
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
