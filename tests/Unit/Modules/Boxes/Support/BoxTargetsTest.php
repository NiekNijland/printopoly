<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Boxes\Support;

use App\Modules\Boxes\Support\BoxTargets;
use App\Modules\Editions\Support\StandardEdition;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class BoxTargetsTest extends TestCase
{
    /**
     * @return array<string, array{string, bool}>
     */
    public static function keys(): array
    {
        return [
            'a street' => ['space.01', true],
            'a station' => ['space.05', true],
            'a utility' => ['space.12', true],
            'a corner' => ['space.00', true],
            'a community chest space' => ['space.02', false],
            'a tax space' => ['space.04', false],
            'a space past the board' => ['space.40', false],
            'the first chance card' => ['card.chance.01', true],
            'the last chest card' => ['card.chest.16', true],
            'card number zero' => ['card.chance.00', false],
            'an extra card' => ['card.chance.17', false],
            'a colour group' => ['group.brown', true],
            'an unknown colour group' => ['group.purple', false],
            'the eighth pawn' => ['pawn.08', true],
            'a ninth pawn' => ['pawn.09', false],
            'pawn number zero' => ['pawn.00', false],
            'the board centre' => ['board_center', false],
            'a new card' => ['newcard.chance', false],
        ];
    }

    #[DataProvider('keys')]
    public function test_a_friend_may_only_add_to_spaces_cards_groups_and_pawns(string $key, bool $allowed): void
    {
        self::assertSame($allowed, $this->targets()->allows($key));
    }

    public function test_an_extra_card_is_open_only_while_the_box_holds_it_and_has_cards(): void
    {
        $targets = $this->targets();
        $added = ['elements' => ['card.chance.17' => ['text' => 'Ga naar de Molenweg', 'added' => true]]];

        self::assertTrue($targets->allowsIn('card.chance.17', $added));
        self::assertFalse($targets->allowsIn('card.chance.18', $added));
        self::assertFalse($targets->allowsIn('card.chance.17', ['elements' => ['card.chance.17' => ['text' => 'Ga naar de Molenweg']]]));
        self::assertFalse($targets->allowsIn('card.chance.17', [...$added, 'parts' => ['cards' => false]]));
        self::assertTrue($targets->allowsIn('card.chance.01', ['parts' => ['cards' => false]]));
        self::assertFalse($targets->allowsIn('board_center', $added));
    }

    public function test_a_new_card_fits_only_while_the_deck_has_room(): void
    {
        $targets = $this->targets();
        $full = [];

        for ($number = 17; $number <= 32; $number++) {
            $full['card.chest.' . $number] = ['text' => 'Feest', 'added' => true];
        }

        self::assertTrue($targets->allowsIn('newcard.chest', ['elements' => []]));
        self::assertTrue($targets->allowsIn('newcard.chance', ['elements' => $full]));
        self::assertFalse($targets->allowsIn('newcard.chest', ['elements' => $full]));
        self::assertFalse($targets->allowsIn('newcard.chest', ['elements' => [], 'parts' => ['cards' => false]]));
        self::assertTrue($targets->roomInDeck('chest', array_slice($full, 0, 15, true)));
        self::assertFalse($targets->roomInDeck('chest', $full));
    }

    public function test_a_space_is_any_of_the_forty_whether_friends_can_add_to_it_or_not(): void
    {
        $targets = $this->targets();

        self::assertTrue($targets->isSpace('space.02'));
        self::assertTrue($targets->isSpace('space.39'));
        self::assertFalse($targets->isSpace('space.40'));
        self::assertFalse($targets->isSpace('card.chance.01'));
    }

    public function test_only_cards_and_proposals_take_an_amount(): void
    {
        $targets = $this->targets();

        self::assertTrue($targets->takesAmount('card.chance.07'));
        self::assertFalse($targets->takesAmount('card.chance.01'));
        self::assertTrue($targets->takesAmount('card.chance.20'));
        self::assertTrue($targets->takesAmount('newcard.chest'));
        self::assertFalse($targets->takesAmount('space.01'));
        self::assertFalse($targets->isExtraCard('card.chance.33'));
        self::assertFalse($targets->isExtraCard('space.17'));
    }

    public function test_an_amount_follows_the_standard_card_or_the_limit_of_an_extra_card(): void
    {
        $targets = $this->targets();

        self::assertTrue($targets->amountAllowed('card.chance.07', 50));
        self::assertTrue($targets->amountAllowed('card.chance.07', -50));
        self::assertFalse($targets->amountAllowed('card.chance.07', 1_000_000));
        self::assertFalse($targets->amountAllowed('card.chance.07', 0));
        self::assertFalse($targets->amountAllowed('card.chance.01', 50));
        self::assertTrue($targets->amountAllowed('card.chance.17', 500));
        self::assertTrue($targets->amountAllowed('newcard.chest', -500));
        self::assertFalse($targets->amountAllowed('card.chance.17', 501));
        self::assertFalse($targets->amountAllowed('space.01', 50));
    }

    public function test_each_target_has_its_own_field_length_and_photo(): void
    {
        $targets = $this->targets();

        self::assertSame('text', $targets->field('card.chest.02'));
        self::assertSame('text', $targets->field('newcard.chance'));
        self::assertSame('town', $targets->field('group.red'));
        self::assertSame('name', $targets->field('space.01'));
        self::assertSame('name', $targets->field('pawn.01'));
        self::assertSame(BoxTargets::MAX_TEXT, $targets->maxLength('card.chest.02'));
        self::assertSame(BoxTargets::MAX_NAME, $targets->maxLength('group.red'));
        self::assertSame(BoxTargets::MAX_NAME, $targets->maxLength('pawn.01'));
        self::assertFalse($targets->takesPhoto('group.red'));
        self::assertTrue($targets->takesPhoto('pawn.01'));
    }

    /**
     * @return array<string, array{string, bool}>
     */
    public static function texts(): array
    {
        return [
            'a web address' => ['kijk op https://feest', true],
            'www' => ['www.molenweg', true],
            'a domain' => ['molenweg.nl', true],
            'an email address' => ['sanne@molenweg.nl', true],
            'a street' => ['Molenweg 12', false],
            'a sentence with a full stop' => ['Ga naar start. Ontvang 200', false],
        ];
    }

    #[DataProvider('texts')]
    public function test_a_text_that_looks_like_a_link_is_spotted(string $text, bool $link): void
    {
        self::assertSame($link, BoxTargets::looksLikeLink($text));
    }

    public function test_a_text_is_tidied_to_one_line_with_single_spaces(): void
    {
        self::assertSame('Ga naar de Molenweg', BoxTargets::tidy("  Ga\tnaar\n\nde \u{200B}Molenweg\x07 "));
        self::assertSame('', BoxTargets::tidy("\n\t "));
    }

    private function targets(): BoxTargets
    {
        return new BoxTargets(StandardEdition::load());
    }
}
