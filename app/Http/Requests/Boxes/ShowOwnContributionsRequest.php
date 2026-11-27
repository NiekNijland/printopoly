<?php

declare(strict_types=1);

namespace App\Http\Requests\Boxes;

use Illuminate\Foundation\Http\FormRequest;

final class ShowOwnContributionsRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'receipts' => ['required', 'array', 'max:50'],
            'receipts.*' => ['string', 'size:32'],
        ];
    }

    /**
     * @return list<string>
     */
    public function receipts(): array
    {
        return array_values(array_filter($this->safe()->array('receipts'), is_string(...)));
    }
}
