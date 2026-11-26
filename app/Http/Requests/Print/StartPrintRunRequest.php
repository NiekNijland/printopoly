<?php

declare(strict_types=1);

namespace App\Http\Requests\Print;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PhotoTargets;
use App\Modules\Print\Support\PrintChoiceInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StartPrintRunRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'set' => ['required', Rule::enum(PrintSet::class)],
            'parts' => ['required', 'array', 'min:1'],
            'parts.*' => [Rule::enum(PrintPart::class)],
            'targets' => ['nullable', 'array'],
            // The choices of the set travel with the run, so the money and the count are right (bug 6, B156).
            'choices' => ['sometimes', 'array'],
            // The language of the site the user prints from: the instructions and file names follow it (B184).
            'locale' => ['nullable', 'in:' . implode(',', Locale::values())],
            ...PrintChoiceInput::rules('choices.'),
        ];
    }

    public function set(): PrintSet
    {
        return PrintSet::from($this->safe()->string('set')->toString());
    }

    /**
     * @return list<PrintPart>
     */
    public function parts(): array
    {
        $parts = [];

        foreach ($this->safe()->array('parts') as $value) {
            $part = PrintPart::tryFrom(is_string($value) ? $value : '');

            if ($part instanceof PrintPart && ! in_array($part, $parts, true)) {
                $parts[] = $part;
            }
        }

        return $parts;
    }

    public function locale(): ?Locale
    {
        return Locale::tryFrom($this->safe()->string('locale')->toString());
    }

    /**
     * @return array<mixed>|null
     */
    public function choices(): ?array
    {
        $choices = $this->safe()->input('choices');

        return is_array($choices) ? $choices : null;
    }

    /**
     * @return array<string, array<string, array{w: float, h: float}>>|null
     */
    public function targets(): ?array
    {
        return $this->safe()->has('targets') ? PhotoTargets::clean($this->safe()->input('targets')) : null;
    }
}
