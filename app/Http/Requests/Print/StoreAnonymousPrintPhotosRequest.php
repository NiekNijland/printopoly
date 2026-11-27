<?php

declare(strict_types=1);

namespace App\Http\Requests\Print;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

final class StoreAnonymousPrintPhotosRequest extends FormRequest
{
    public const int BATCH = 10;

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'photos' => ['required', 'array', 'max:' . self::BATCH],
            'photos.*' => ['file'],
        ];
    }

    /**
     * @return array<int|string, UploadedFile>
     */
    public function photos(): array
    {
        return self::photosOf($this);
    }

    /**
     * @return array<int|string, UploadedFile>
     */
    public static function photosOf(FormRequest $request): array
    {
        $uploads = [];
        $files = $request->file('photos', []);

        foreach (is_array($files) ? $files : [] as $ref => $file) {
            if (! $file->isValid() || preg_match('/^[A-Za-z0-9_-]{8,64}$/', (string) $ref) !== 1) {
                throw ValidationException::withMessages(['photos' => __('photo.unreadable')]);
            }

            $uploads[(string) $ref] = $file;
        }

        return $uploads;
    }

    public function photoCount(): int
    {
        $files = $this->file('photos', []);

        return is_array($files) ? count($files) : 0;
    }
}
