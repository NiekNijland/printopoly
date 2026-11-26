<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Models\PrintJob;
use App\Modules\Editions\Enums\ElementKind;
use App\Modules\Editions\Support\StandardEdition;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\ValueObjects\PrintEdition;
use InvalidArgumentException;
use JsonException;
use stdClass;

final readonly class PrintEditionReader
{
    public function __construct(private StandardEdition $standard, private DeedPhotos $deedPhotos)
    {
    }

    /**
     * @throws InvalidArgumentException
     */
    public function fromJson(string $json): PrintEdition
    {
        try {
            $data = json_decode($json, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new InvalidArgumentException('The edition is not valid JSON.');
        }

        throw_unless(is_array($data), InvalidArgumentException::class, 'The edition is not an object.');

        return $this->fromArray($data);
    }

    /**
     * @param array<mixed> $data
     * @param array<string, array{width: int, height: int}> $photoSizes Pixel sizes by photo ref: with them a deed
     *                                                                  that borrows the photo of its space gets the
     *                                                                  crop of its own frame, as in the browser (B239).
     *
     * @throws InvalidArgumentException
     */
    public function fromArray(array $data, array $photoSizes = []): PrintEdition
    {
        $elements = $data['elements'] ?? [];

        if ($elements instanceof stdClass) {
            $elements = (array) $elements;
        }

        throw_unless(is_array($elements), InvalidArgumentException::class, 'An edition has elements as an object.');

        $clean = [];
        foreach ($elements as $key => $element) {
            throw_unless(is_array($element), InvalidArgumentException::class, 'Every element is an object.');

            $clean[(string) $key] = $element;
        }

        $clean = $this->deedPhotos->withDeedPhotos($clean, $photoSizes);

        return new PrintEdition(
            name: is_string($data['name'] ?? null) ? $data['name'] : '',
            language: is_string($data['language'] ?? null) ? $data['language'] : null,
            theme: is_string($data['theme'] ?? null) ? $data['theme'] : null,
            boardProfile: is_array($data['boardProfile'] ?? null) ? $data['boardProfile'] : null,
            elements: $clean,
            standardCardCount: $this->standardCardCount(),
            extraCardCandidates: $this->extraCardCandidates(array_keys($clean)),
            invitations: PrintJob::DEFAULT_INVITATIONS,
            parts: $this->parts($data['parts'] ?? null),
            currency: is_string($data['currency'] ?? null) ? $data['currency'] : null,
            moneyAmount: MoneyAmount::tryFrom(is_string($data['moneyAmount'] ?? null) ? $data['moneyAmount'] : ''),
        );
    }

    private function standardCardCount(): int
    {
        return $this->standard->components()['titleDeeds'] + count($this->standard->deck('chance')) + count($this->standard->deck('chest'));
    }

    /**
     * @param list<string> $keys
     * @return list<string>
     */
    private function extraCardCandidates(array $keys): array
    {
        $extra = array_values(array_filter($keys, fn (string $key): bool => ElementKind::isExtraCard($key, $this->standard)));
        sort($extra);

        return $extra;
    }

    /**
     * @return array<string, bool>
     */
    private function parts(mixed $value): array
    {
        $parts = [];

        foreach (is_array($value) ? $value : [] as $key => $on) {
            if (is_bool($on)) {
                $parts[(string) $key] = $on;
            }
        }

        return $parts;
    }
}
