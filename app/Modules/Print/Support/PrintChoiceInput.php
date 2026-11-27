<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Models\PrintJob;
use App\Modules\Print\Data\PrintSetChoiceData;
use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
use Illuminate\Validation\Rule;

/**
 * The choices of one set as the print page sends them, with the run or on their own: the parts it skips, the
 * amount of play money, the number of sets, the form of the board and the number of invitations. A field that is not
 * sent keeps what the job had.
 */
final class PrintChoiceInput
{
    /**
     * @return array<string, mixed>
     */
    public static function rules(string $prefix = ''): array
    {
        return [
            $prefix . 'skipped' => ['sometimes', 'array', 'max:' . count(PrintPart::cases())],
            $prefix . 'skipped.*' => [Rule::enum(PrintPart::class)],
            $prefix . 'moneyAmount' => ['sometimes', 'nullable', Rule::enum(MoneyAmount::class)],
            $prefix . 'copies' => ['sometimes', 'integer', 'min:1', 'max:' . PrintJob::MAX_COPIES],
            $prefix . 'boardForm' => ['sometimes', Rule::enum(BoardForm::class)],
            $prefix . 'invitations' => ['sometimes', 'integer', 'min:1', 'max:' . PrintJob::MAX_INVITATIONS],
        ];
    }

    /**
     * @param array<mixed> $input Already validated with `rules()`.
     */
    public static function merge(array $input, PrintSetChoiceData $current): PrintSetChoiceData
    {
        $skipped = $current->skipped;

        if (is_array($input['skipped'] ?? null)) {
            $skipped = [];

            foreach ($input['skipped'] as $value) {
                $part = PrintPart::tryFrom(is_string($value) ? $value : '');

                if ($part instanceof PrintPart && $part !== PrintPart::BOARD && ! in_array($part, $skipped, true)) {
                    $skipped[] = $part;
                }
            }
        }

        $moneyAmount = array_key_exists('moneyAmount', $input)
            ? MoneyAmount::tryFrom(is_string($input['moneyAmount']) ? $input['moneyAmount'] : '')
            : $current->moneyAmount;
        $copies = is_int($input['copies'] ?? null) ? $input['copies'] : $current->copies;
        $boardForm = BoardForm::tryFrom(is_string($input['boardForm'] ?? null) ? $input['boardForm'] : '') ?? $current->boardForm;
        $invitations = is_int($input['invitations'] ?? null) ? $input['invitations'] : $current->invitations;

        return new PrintSetChoiceData(skipped: $skipped, moneyAmount: $moneyAmount, copies: $copies, boardForm: $boardForm, invitations: $invitations);
    }
}
