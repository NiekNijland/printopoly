<?php

declare(strict_types=1);

namespace App\Http\Requests\Editions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class StoreAssetRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'ref' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'photo' => ['required', 'file'],
        ];
    }

    public function ref(): string
    {
        return $this->safe()->string('ref')->toString();
    }

    public function photo(): UploadedFile
    {
        $file = $this->file('photo');

        throw_if(! $file instanceof UploadedFile || ! $file->isValid(), HttpException::class, 422);

        return $file;
    }
}
