<?php

declare(strict_types=1);

namespace App\Http\Requests\Print;

use App\Modules\Content\Enums\Locale;
use Illuminate\Foundation\Http\FormRequest;

final class StoreEditionPrintJobRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['locale' => ['nullable', 'in:' . implode(',', Locale::values())]];
    }

    /**
     * The language of the site the user prints from (B184); the edition can be in another one.
     */
    public function locale(): ?Locale
    {
        return Locale::tryFrom($this->safe()->string('locale')->toString());
    }
}
