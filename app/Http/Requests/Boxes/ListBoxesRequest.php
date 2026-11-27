<?php

declare(strict_types=1);

namespace App\Http\Requests\Boxes;

use Illuminate\Foundation\Http\FormRequest;

final class ListBoxesRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['edition' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/']];
    }

    public function editionId(): string
    {
        return $this->safe()->string('edition')->toString();
    }
}
