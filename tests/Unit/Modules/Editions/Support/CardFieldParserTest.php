<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\CardFieldParser;
use App\Modules\Editions\Support\StandardEdition;
use PHPUnit\Framework\TestCase;

final class CardFieldParserTest extends TestCase
{
    public function test_a_standard_card_takes_an_amount_within_twenty_percent_either_way(): void
    {
        $parser = new CardFieldParser(StandardEdition::load());
        $errors = [];

        self::assertSame(-40, $parser->amount('card.chance.07', -40, 'at', $errors));
        self::assertSame(0, $parser->amount('card.chance.07', 0, 'at', $errors));
        self::assertNull($parser->amount('card.chance.07', 39, 'at', $errors));
        self::assertNull($parser->amount('card.chance.01', 50, 'at', $errors));
        self::assertNull($parser->amount('card.chance.07', null, 'at', $errors));
        self::assertSame([
            'at: must be between 40 and 60, in the direction of the standard amount',
            'at: this card has no amount',
            'at: must be a number',
        ], $errors);
    }

    public function test_an_extra_card_takes_a_whole_amount_up_to_five_hundred(): void
    {
        $parser = new CardFieldParser(StandardEdition::load());
        $errors = [];

        self::assertSame(500, $parser->amount('card.chest.32', 500, 'at', $errors));
        self::assertNull($parser->amount('card.chest.32', -501, 'at', $errors));
        self::assertSame(['at: must be a whole amount from -500 to 500, not 0'], $errors);
    }

    public function test_only_an_extra_card_is_added_and_only_with_true(): void
    {
        $parser = new CardFieldParser(StandardEdition::load());
        $errors = [];

        self::assertTrue($parser->added('card.chance.17', true, 'at', $errors));
        self::assertNull($parser->added('card.chance.17', 1, 'at', $errors));
        self::assertNull($parser->added('card.chance.16', true, 'at', $errors));
        self::assertSame(['at: must be true', 'at: only an extra card is added'], $errors);
    }
}
