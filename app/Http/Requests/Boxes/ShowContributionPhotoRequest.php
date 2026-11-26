<?php

declare(strict_types=1);

namespace App\Http\Requests\Boxes;

use Illuminate\Foundation\Http\FormRequest;

final class ShowContributionPhotoRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['size' => ['nullable']];
    }

    public function wantsPreview(): bool
    {
        return $this->safe()->input('size') === 'preview';
    }
}
