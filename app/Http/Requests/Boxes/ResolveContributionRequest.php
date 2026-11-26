<?php

declare(strict_types=1);

namespace App\Http\Requests\Boxes;

use Illuminate\Foundation\Http\FormRequest;

final class ResolveContributionRequest extends FormRequest
{
    private const array PARTS = ['name', 'text', 'town', 'photo', 'amount'];

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', 'in:accept,reject'],
            'parts' => ['nullable', 'array'],
            'parts.*' => ['string', 'in:' . implode(',', self::PARTS)],
        ];
    }

    public function isAccepted(): bool
    {
        return $this->safe()->string('decision')->toString() === 'accept';
    }

    /**
     * @return list<string>|null
     */
    public function parts(): ?array
    {
        return $this->safe()->has('parts') ? array_values(array_filter($this->safe()->array('parts'), is_string(...))) : null;
    }
}
