<?php

declare(strict_types=1);

namespace App\Http\Requests\Boxes;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateBoxRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'editionName' => ['nullable', 'string', 'max:120'],
            'snapshot' => ['nullable', 'array'],
            'cardsHidden' => ['nullable', 'boolean'],
        ];
    }

    public function cardsHidden(): ?bool
    {
        return $this->safe()->input('cardsHidden') !== null ? $this->safe()->boolean('cardsHidden') : null;
    }

    /**
     * @return array<mixed>|null
     */
    public function snapshot(): ?array
    {
        return $this->safe()->input('snapshot') !== null ? $this->safe()->array('snapshot') : null;
    }

    public function editionName(): ?string
    {
        return $this->safe()->filled('editionName') ? $this->safe()->string('editionName')->toString() : null;
    }
}
