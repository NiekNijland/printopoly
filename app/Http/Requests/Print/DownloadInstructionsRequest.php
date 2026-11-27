<?php

declare(strict_types=1);

namespace App\Http\Requests\Print;

use App\Modules\Print\Enums\PrintSet;
use Illuminate\Foundation\Http\FormRequest;

final class DownloadInstructionsRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['set' => ['nullable']];
    }

    public function set(): ?PrintSet
    {
        $set = $this->safe()->input('set');

        return is_string($set) ? PrintSet::tryFrom($set) : null;
    }
}
