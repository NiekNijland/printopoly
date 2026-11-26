<?php

declare(strict_types=1);

namespace App\Http\Requests\Editions;

use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @phpstan-import-type PatchInput from EditionValidator
 */
final class PatchEditionRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    /**
     * @return PatchInput
     */
    public function patch(EditionValidator $validator): array
    {
        return $validator->patch($this->json()->all());
    }
}
