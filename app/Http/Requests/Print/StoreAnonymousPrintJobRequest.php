<?php

declare(strict_types=1);

namespace App\Http\Requests\Print;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Support\PhotoTargets;
use App\Modules\Print\Support\PrintEditionReader;
use App\Modules\Print\ValueObjects\PrintEdition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use JsonException;

/**
 * Fields: `edition` (JSON text), `targets` (JSON text, optional: the frame size of every visible photo per set), `locale` (the
 * language of the site the user prints from, for the instructions, the file names and the link, B184), and `photos[<ref>]` files, where
 * `<ref>` is the id the edition JSON uses for the photo.
 */
final class StoreAnonymousPrintJobRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'edition' => ['required', 'string', 'max:' . Config::integer('printopoly.limits.edition_json_kilobytes') * 1024],
            'locale' => ['nullable', 'in:' . implode(',', Locale::values())],
            'photos' => ['nullable', 'array', 'max:' . Config::integer('printopoly.limits.anonymous_photos_per_job')],
            'photos.*' => ['file'],
            'targets' => ['nullable', 'string', 'max:262144'],
            'partial' => ['nullable', 'boolean'],
            'previous' => ['nullable', 'string', 'max:64'],
        ];
    }

    public function editionJson(): string
    {
        return $this->safe()->string('edition')->toString();
    }

    /**
     * @throws ValidationException
     */
    public function edition(PrintEditionReader $reader): PrintEdition
    {
        try {
            return $reader->fromJson($this->editionJson());
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['edition' => __('print.edition_invalid')]);
        }
    }

    public function locale(): ?Locale
    {
        return Locale::tryFrom($this->safe()->string('locale')->toString());
    }

    public function isPartial(): bool
    {
        return $this->safe()->boolean('partial');
    }

    public function previousToken(): string
    {
        return $this->safe()->string('previous')->toString();
    }

    /**
     * @return array<string, array<string, array{w: float, h: float}>>|null
     */
    public function targets(): ?array
    {
        if (! $this->safe()->filled('targets')) {
            return null;
        }

        try {
            return PhotoTargets::clean(json_decode($this->safe()->string('targets')->toString(), true, 16, JSON_THROW_ON_ERROR));
        } catch (JsonException) {
            throw ValidationException::withMessages(['targets' => __('print.edition_invalid')]);
        }
    }

    /**
     * @return array<int|string, UploadedFile>
     */
    public function photos(): array
    {
        $uploads = [];
        $files = $this->file('photos', []);

        foreach (is_array($files) ? $files : [] as $ref => $file) {
            if (! $file->isValid() || preg_match('/^[A-Za-z0-9_-]{8,64}$/', (string) $ref) !== 1) {
                throw ValidationException::withMessages(['photos' => __('photo.unreadable')]);
            }

            $uploads[(string) $ref] = $file;
        }

        return $uploads;
    }
}
