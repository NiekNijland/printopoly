<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Print\Data\PrintSetChoiceData;
use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Support\PrintChoiceInput;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class PrintChoiceInputTest extends TestCase
{
    /**
     * @return array<string, array{array<string, mixed>, list<string>}>
     */
    public static function invalidInput(): array
    {
        return [
            'an unknown part' => [['home' => ['skipped' => ['dice']]], ['home.skipped.0']],
            'more parts than there are' => [['home' => ['skipped' => array_fill(0, count(PrintPart::cases()) + 1, 'cards')]], ['home.skipped']],
            'an unknown amount of money' => [['home' => ['moneyAmount' => 'twelve']], ['home.moneyAmount']],
            'no sets' => [['home' => ['copies' => 0]], ['home.copies']],
            'more sets than a club' => [['home' => ['copies' => 41]], ['home.copies']],
            'an unknown board form' => [['home' => ['boardForm' => 'round']], ['home.boardForm']],
            'too many invitations' => [['home' => ['invitations' => 501]], ['home.invitations']],
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @param list<string> $errors
     */
    #[DataProvider('invalidInput')]
    public function test_the_rules_refuse_what_the_page_cannot_send(array $input, array $errors): void
    {
        $validator = Validator::make($input, PrintChoiceInput::rules('home.'));

        self::assertSame($errors, $validator->errors()->keys());
    }

    public function test_the_rules_take_every_field_at_its_limit_and_a_missing_field(): void
    {
        $input = ['skipped' => ['money', 'tokens'], 'moneyAmount' => null, 'copies' => 40, 'boardForm' => 'whole', 'invitations' => 500];

        self::assertFalse(Validator::make($input, PrintChoiceInput::rules())->fails());
        self::assertFalse(Validator::make([], PrintChoiceInput::rules())->fails());
    }

    public function test_a_field_that_is_not_sent_keeps_what_the_job_had(): void
    {
        $current = new PrintSetChoiceData(skipped: [PrintPart::MONEY], moneyAmount: MoneyAmount::EIGHT, copies: 3, boardForm: BoardForm::WHOLE, invitations: 12);

        $merged = PrintChoiceInput::merge([], $current);

        self::assertSame([PrintPart::MONEY], $merged->skipped);
        self::assertSame(MoneyAmount::EIGHT, $merged->moneyAmount);
        self::assertSame(3, $merged->copies);
        self::assertSame(BoardForm::WHOLE, $merged->boardForm);
        self::assertSame(12, $merged->invitations);
    }

    public function test_sent_fields_replace_the_choice_and_the_board_and_doubles_are_left_out(): void
    {
        $current = new PrintSetChoiceData(skipped: [PrintPart::MONEY], moneyAmount: MoneyAmount::EIGHT, copies: 3);

        $merged = PrintChoiceInput::merge([
            'skipped' => ['tokens', 'board', 'tokens', 'invitation', 7],
            'moneyAmount' => 'full',
            'copies' => 2,
            'boardForm' => 'whole',
            'invitations' => 30,
        ], $current);

        self::assertSame([PrintPart::TOKENS, PrintPart::INVITATION], $merged->skipped);
        self::assertSame(MoneyAmount::FULL, $merged->moneyAmount);
        self::assertSame(2, $merged->copies);
        self::assertSame(BoardForm::WHOLE, $merged->boardForm);
        self::assertSame(30, $merged->invitations);
    }

    public function test_a_sent_empty_amount_of_money_goes_back_to_the_default(): void
    {
        $current = new PrintSetChoiceData(skipped: [], moneyAmount: MoneyAmount::FOUR, copies: 1);

        self::assertNull(PrintChoiceInput::merge(['moneyAmount' => null], $current)->moneyAmount);
        self::assertSame([], PrintChoiceInput::merge(['skipped' => []], new PrintSetChoiceData(skipped: [PrintPart::CARDS], moneyAmount: null, copies: 1))->skipped);
    }
}
