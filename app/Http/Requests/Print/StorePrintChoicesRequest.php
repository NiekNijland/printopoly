<?php

declare(strict_types=1);

namespace App\Http\Requests\Print;

use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintChoiceInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StorePrintChoicesRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'set' => ['required', Rule::enum(PrintSet::class)],
            ...PrintChoiceInput::rules(),
        ];
    }

    public function set(): PrintSet
    {
        return PrintSet::from($this->safe()->string('set')->toString());
    }

    /**
     * @return array<mixed>
     */
    public function choices(): array
    {
        return $this->validated();
    }
}
