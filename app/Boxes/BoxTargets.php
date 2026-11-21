<?php

declare(strict_types=1);

namespace App\Boxes;

use App\Edition\ElementKind;
use App\Game\StandardEdition;

/**
 * What a friend may add to (B128): a space (a name and a photo), a Chance or Community Chest card (a text and a
 * photo), an extra card the edition added (B135) while the box says it is there, a pawn (a name and a photo) or the
 * town of a colour group (a name). Nothing else of an edition can be reached through a box: no board
 * centre, no box lid, no money. The keys are the fixed element keys of B60.
 */
final readonly class BoxTargets
{
    public const int MAX_NAME = 40;

    public const int MAX_TEXT = 200;

    public const int MAX_FIRST_NAME = 30;

    public function __construct(private StandardEdition $standard)
    {
    }

    public function allows(string $key): bool
    {
        if (preg_match('/^space\.(\d{2})$/', $key, $match) === 1) {
            return (int) $match[1] < count($this->standard->spaces());
        }

        if (preg_match('/^card\.(chance|chest)\.(\d{2})$/', $key, $match) === 1) {
            $number = (int) $match[2];

            return $number >= 1 && $number <= count($this->standard->deck($match[1]));
        }

        if (preg_match('/^group\.([a-z_]+)$/', $key, $match) === 1) {
            return in_array($match[1], array_column($this->standard->groups(), 'id'), true);
        }

        if (preg_match('/^pawn\.(\d{2})$/', $key, $match) === 1) {
            return (int) $match[1] >= 1 && (int) $match[1] <= 8;
        }

        return false;
    }

    /**
     * Whether a friend may add to this key in this box: everything `allows` says, plus the extra cards the
     * snapshot of the box holds (B135).
     *
     * @param array<mixed> $snapshot
     */
    public function allowsIn(string $key, array $snapshot): bool
    {
        if ($this->allows($key)) {
            return true;
        }

        $elements = is_array($snapshot['elements'] ?? null) ? $snapshot['elements'] : [];
        $element = $elements[$key] ?? null;
        $cards = is_array($snapshot['parts'] ?? null) ? ($snapshot['parts']['cards'] ?? true) : true;

        return $cards !== false && $this->isExtraCard($key) && is_array($element) && ($element['added'] ?? false) === true;
    }

    /**
     * An extra card after the standard ones (B135): `card.chance.17` to `card.chance.32`.
     */
    public function isExtraCard(string $key): bool
    {
        if (preg_match('/^card\.(chance|chest)\.(\d{2})$/', $key, $match) !== 1) {
            return false;
        }

        $number = (int) $match[2];

        return $number > count($this->standard->deck($match[1])) && $number <= ElementKind::MAX_DECK_SIZE;
    }

    /**
     * Cards have a text, the colour groups of the streets a town (town field, B123), spaces and pawns a name.
     *
     * @return 'name'|'text'|'town'
     */
    public function field(string $key): string
    {
        return match (true) {
            str_starts_with($key, 'card.') => 'text',
            str_starts_with($key, 'group.') => 'town',
            default => 'name',
        };
    }

    /**
     * Only spaces, cards and pawns have a photo; a colour group is just a town name.
     */
    public function takesPhoto(string $key): bool
    {
        return ! str_starts_with($key, 'group.');
    }

    public function maxLength(string $key): int
    {
        return $this->field($key) === 'text' ? self::MAX_TEXT : self::MAX_NAME;
    }

    /**
     * Whether a text looks like a link or an address: a box is for names and card texts, not for advertising.
     */
    public static function looksLikeLink(string $text): bool
    {
        return preg_match('~(https?:|www\.|\w\.(com|nl|net|org|io|ru|cn|xyz|top|biz)\b|@\w+\.\w)~iu', $text) === 1;
    }

    /**
     * One line, single spaces, no control characters.
     */
    public static function tidy(string $text): string
    {
        $text = preg_replace('/[\p{Cc}\p{Cf}]+/u', ' ', $text) ?? '';

        return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    }
}
