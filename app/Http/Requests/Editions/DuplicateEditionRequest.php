<?php

declare(strict_types=1);

namespace App\Http\Requests\Editions;

use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Foundation\Http\FormRequest;

final class DuplicateEditionRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'min:1', 'max:' . EditionValidator::MAX_NAME_LENGTH],
        ];
    }

    public function name(): ?string
    {
        return $this->safe()->filled('name') ? $this->safe()->string('name')->toString() : null;
    }
}
