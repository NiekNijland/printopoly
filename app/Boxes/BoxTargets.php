<?php

declare(strict_types=1);

namespace App\Boxes;

use App\Edition\Amounts;
use App\Edition\ElementKind;
use App\Game\StandardEdition;

/**
 * What a friend may add to (B128): a space that shows a photo and its own name (a street, station, utility or
 * corner, B175), a Chance or Community Chest card (a text, a photo and the amount if the card has one), an extra
 * card the edition added (B135) while the box says it is there, a new extra card while the deck has room (B175),
 * a pawn (a name and a photo) or the town of a colour group (a name). Nothing else of an edition can be reached
 * through a box: no board centre, no box lid, no money. The keys are the fixed element keys of B60, plus
 * `newcard.chance` and `newcard.chest` for a card that is not there yet.
 *
 * @phpstan-import-type Card from StandardEdition
 */
final readonly class BoxTargets
{
    public const int MAX_NAME = 40;

    public const int MAX_TEXT = 200;

    public const int MAX_FIRST_NAME = 30;

    public function __construct(private StandardEdition $standard)
    {
    }

    /** The kinds of spaces that show a photo and their own name; Kans, Algemeen Fonds and tax spaces do not (B175). */
    private const array SPACE_TYPES = ['street', 'station', 'utility', 'corner'];

    public function allows(string $key): bool
    {
        if (preg_match('/^space\.(\d{2})$/', $key, $match) === 1) {
            $position = (int) $match[1];

            return $position < count($this->standard->spaces())
                && in_array($this->standard->spaceAt($position)['type'], self::SPACE_TYPES, true);
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

        if ($cards === false) {
            return false;
        }

        if ($this->isNewCard($key)) {
            return $this->roomInDeck(substr($key, 8), $elements);
        }

        return $this->isExtraCard($key) && is_array($element) && ($element['added'] ?? false) === true;
    }

    /**
     * Any of the 40 spaces, whether or not friends can add to it.
     */
    public function isSpace(string $key): bool
    {
        return preg_match('/^space\.(\d{2})$/', $key, $match) === 1 && (int) $match[1] < count($this->standard->spaces());
    }

    /**
     * A proposal for a card that is not there yet (B175): `newcard.chance` or `newcard.chest`. The owner adds it as
     * the next extra card when they apply it.
     */
    public function isNewCard(string $key): bool
    {
        return preg_match('/^newcard\.(chance|chest)$/', $key) === 1;
    }

    /**
     * Whether a deck can take one more extra card: up to 32 cards in all (B135).
     *
     * @param array<mixed> $elements The elements of the snapshot.
     */
    public function roomInDeck(string $deck, array $elements): bool
    {
        $added = 0;

        foreach ($elements as $key => $element) {
            if (str_starts_with((string) $key, "card.{$deck}.") && $this->isExtraCard((string) $key) && is_array($element) && ($element['added'] ?? false) === true) {
                $added++;
            }
        }

        return count($this->standard->deck($deck)) + $added < ElementKind::MAX_DECK_SIZE;
    }

    /**
     * Whether a friend can propose an amount here: a standard card with an amount, an extra card or a new one.
     */
    public function takesAmount(string $key): bool
    {
        return $this->isNewCard($key) || $this->isExtraCard($key) || ($this->standardCard($key)['amount'] ?? 0) !== 0;
    }

    /**
     * Whether a signed amount is allowed for this card: within the range of the standard amount and in its
     * direction, or a free amount up to 500 on an extra card. Zero is not a proposal.
     */
    public function amountAllowed(string $key, int $amount): bool
    {
        if ($amount === 0 || ! $this->takesAmount($key)) {
            return false;
        }

        $card = $this->standardCard($key);

        return $card === null ? Amounts::extraCardAmountAllowed($amount) : Amounts::cardAmountAllowed($card, $amount);
    }

    /**
     * @return Card|null
     */
    private function standardCard(string $key): ?array
    {
        if (preg_match('/^card\.(chance|chest)\.(\d{2})$/', $key, $match) !== 1) {
            return null;
        }

        return $this->standard->deck($match[1])[(int) $match[2] - 1] ?? null;
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
            str_starts_with($key, 'card.'), str_starts_with($key, 'newcard.') => 'text',
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
