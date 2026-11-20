<?php

declare(strict_types=1);

namespace App\Boxes;

use App\Game\StandardEdition;

/**
 * What a friend may add to (B128): a space (a name and a photo), a Chance or Community Chest card (a text and a
 * photo), a pawn (a name and a photo) or the town of a colour group (a name). Nothing else of an edition can be reached through a box: no board
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
     * Cards have a text, the colour groups of the streets a town (town field, B123), spaces and pawns a name.
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
