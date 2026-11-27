<?php

declare(strict_types=1);

namespace App\Http\Requests\Print;

use Illuminate\Foundation\Http\FormRequest;

final class ShowEditionPrintRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['part' => ['nullable']];
    }

    /**
     * "niet in je set" in the editor asks for the row of one part (R6 Kees); the page of the job opens there.
     *
     * @return array{part?: string}
     */
    public function partQuery(): array
    {
        $part = $this->safe()->input('part');

        return is_string($part) && preg_match('/^[a-z_]{1,20}$/', $part) === 1 ? ['part' => $part] : [];
    }
}
