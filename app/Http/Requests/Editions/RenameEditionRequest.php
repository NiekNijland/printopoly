<?php

declare(strict_types=1);

namespace App\Http\Requests\Editions;

use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Foundation\Http\FormRequest;

final class RenameEditionRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'baseRevision' => ['required', 'integer', 'min:0'],
            'name' => ['required', 'string', 'min:1', 'max:' . EditionValidator::MAX_NAME_LENGTH],
        ];
    }

    public function baseRevision(): int
    {
        return $this->safe()->integer('baseRevision');
    }

    public function name(): string
    {
        return $this->safe()->string('name')->toString();
    }
}
