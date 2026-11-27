<?php

declare(strict_types=1);

namespace App\Http\Requests\Editions;

use App\Models\Edition;
use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

/**
 * @phpstan-import-type EditionInput from EditionValidator
 */
final class ReplaceEditionRequest extends FormRequest
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
    public function edition(EditionValidator $validator, Edition $edition): array
    {
        $input = $validator->edition($this->json()->all());

        if ($input['id'] !== $edition->edition_id) {
            throw ValidationException::withMessages(['edition' => ['id: does not match the edition in the URL']]);
        }

        return $input;
    }

    public function baseRevision(): int
    {
        $base = $this->json()->all()['baseRevision'] ?? null;

        if (! is_int($base) || $base < 0) {
            throw ValidationException::withMessages(['edition' => ['baseRevision: must be a non-negative integer']]);
        }

        return $base;
    }
}
