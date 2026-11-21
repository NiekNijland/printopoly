<?php

declare(strict_types=1);

namespace App\Print;

use App\Data\PrintSetChoiceData;
use App\Enums\MoneyAmount;
use App\Enums\PrintPart;
use App\Models\PrintJob;
use Illuminate\Validation\Rule;

/**
 * The choices of one set as the print page sends them, with the run or on their own: the parts it skips, the
 * amount of play money and the number of sets. A field that is not sent keeps what the job had.
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

                if ($part instanceof PrintPart && $part !== PrintPart::Board && ! in_array($part, $skipped, true)) {
                    $skipped[] = $part;
                }
            }
        }

        $moneyAmount = array_key_exists('moneyAmount', $input)
            ? MoneyAmount::tryFrom(is_string($input['moneyAmount']) ? $input['moneyAmount'] : '')
            : $current->moneyAmount;
        $copies = is_int($input['copies'] ?? null) ? $input['copies'] : $current->copies;

        return new PrintSetChoiceData(skipped: $skipped, moneyAmount: $moneyAmount, copies: $copies);
    }
}
