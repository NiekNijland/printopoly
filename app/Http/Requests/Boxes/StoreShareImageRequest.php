<?php

declare(strict_types=1);

namespace App\Http\Requests\Boxes;

use App\Modules\Boxes\Support\ShareImageRenderer;
use Illuminate\Foundation\Http\FormRequest;

final class StoreShareImageRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'edition' => ['required', 'array'],
            'photos' => ['sometimes', 'array', 'max:' . ShareImageRenderer::MAX_PHOTOS],
        ];
    }

    /**
     * @return array<mixed>
     */
    public function edition(): array
    {
        return $this->safe()->array('edition');
    }

    /**
     * @return array<mixed>
     */
    public function photos(): array
    {
        return $this->safe()->array('photos');
    }
}
