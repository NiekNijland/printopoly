<?php

declare(strict_types=1);

namespace App\Http\Requests\Pages;

use Illuminate\Foundation\Http\FormRequest;

final class TemplatePageRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['template' => ['nullable']];
    }

    public function template(): ?string
    {
        $template = $this->safe()->input('template');

        return is_string($template) ? $template : null;
    }
}
