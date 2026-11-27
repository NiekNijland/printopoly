<?php

declare(strict_types=1);

namespace App\Http\Requests\Boxes;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

final class StoreContributionRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'elementKey' => ['required', 'string', 'max:40'],
            'firstName' => ['required', 'string', 'max:80'],
            'value' => ['nullable', 'string', 'max:1000'],
            'amount' => ['nullable', 'integer', 'between:-100000,100000'],
            'photo' => ['nullable', 'file'],
            'website' => ['nullable', 'string', 'max:200'],
        ];
    }

    public function isBot(): bool
    {
        return $this->safe()->filled('website');
    }

    public function elementKey(): string
    {
        return $this->safe()->string('elementKey')->toString();
    }

    public function firstName(): string
    {
        return $this->safe()->string('firstName')->toString();
    }

    public function value(): string
    {
        return $this->safe()->string('value')->toString();
    }

    public function amount(): ?int
    {
        return $this->safe()->filled('amount') ? $this->safe()->integer('amount') : null;
    }

    public function photo(): ?UploadedFile
    {
        $file = $this->file('photo');

        return $file instanceof UploadedFile ? $file : null;
    }
}
