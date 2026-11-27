<?php

declare(strict_types=1);

namespace App\Http\Requests\Editions;

use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @phpstan-import-type EditionInput from EditionValidator
 */
final class StoreEditionRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    /**
     * @return EditionInput
     */
    public function edition(EditionValidator $validator): array
    {
        return $validator->edition($this->json()->all());
    }
}
