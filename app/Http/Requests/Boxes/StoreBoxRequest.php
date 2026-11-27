<?php

declare(strict_types=1);

namespace App\Http\Requests\Boxes;

use Illuminate\Foundation\Http\FormRequest;

final class StoreBoxRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'editionId' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'editionName' => ['required', 'string', 'max:120'],
            'language' => ['nullable', 'string', 'max:5'],
            'snapshot' => ['present', 'array'],
        ];
    }

    public function editionId(): string
    {
        return $this->safe()->string('editionId')->toString();
    }

    public function editionName(): string
    {
        return $this->safe()->string('editionName')->toString();
    }

    public function language(): mixed
    {
        return $this->safe()->input('language');
    }

    /**
     * @return array<mixed>
     */
    public function snapshot(): array
    {
        return $this->safe()->array('snapshot');
    }
}
