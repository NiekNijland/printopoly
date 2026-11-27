<?php

declare(strict_types=1);

namespace App\Http\Requests\Editions;

use Illuminate\Foundation\Http\FormRequest;

final class ImportEditionsRequest extends FormRequest
{
    /** More than an account can hold, so a full browser still fits in one request. */
    private const int MAX_PER_REQUEST = 50;

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'editions' => ['required', 'array', 'list', 'min:1', 'max:' . self::MAX_PER_REQUEST],
        ];
    }

    /**
     * @return list<mixed>
     */
    public function editions(): array
    {
        return array_values($this->json()->all('editions'));
    }
}
