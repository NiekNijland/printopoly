<?php

declare(strict_types=1);

namespace App\Game;

use InvalidArgumentException;
use JsonException;
use RuntimeException;

/**
 * Reader of resources/data/standard-edition.json, the single source of truth for the
 * standard game data (B59). Mirrors the helpers in resources/js/lib/game/standard-edition.ts.
 *
 * @phpstan-type Localized array{nl: string, en: string}
 * @phpstan-type Space array<string, mixed>
 * @phpstan-type Card array{id: string, effect: Localized, text: Localized}
 */
final class StandardEdition
{
    /** @var list<array<string, mixed>> */
    private readonly array $spaces;

    /**
     * @param array<string, mixed> $data
     */
    private function __construct(private readonly array $data)
    {
        $spaces = $data['spaces'] ?? null;

        if (! is_array($spaces) || ! array_is_list($spaces)) {
            throw new RuntimeException('Standard edition data has no spaces list.');
        }

        /** @var list<array<string, mixed>> $spaces */
        $this->spaces = $spaces;
    }

    public static function load(?string $path = null): self
    {
        $path ??= dirname(__DIR__, 2) . '/resources/data/standard-edition.json';
        $json = file_get_contents($path);

        if ($json === false) {
            throw new RuntimeException("Cannot read {$path}.");
        }

        try {
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException("Invalid JSON in {$path}.", 0, $exception);
        }

        if (! is_array($data)) {
            throw new RuntimeException("Unexpected JSON root in {$path}.");
        }

        /** @var array<string, mixed> $data */
        return new self($data);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function spaces(): array
    {
        return $this->spaces;
    }

    /**
     * @return array<string, mixed>
     */
    public function spaceAt(int $position): array
    {
        $space = $this->spaces[$position] ?? null;

        if ($space === null || $space['position'] !== $position) {
            throw new InvalidArgumentException("No space at position {$position}.");
        }

        return $space;
    }

    /**
     * Rent table of a street (6 values) or a station (4 values).
     *
     * @return list<int>
     */
    public function rentTable(int $position): array
    {
        $space = $this->spaceAt($position);

        if ($space['type'] !== 'street' && $space['type'] !== 'station') {
            throw new InvalidArgumentException("Space {$position} has no rent table.");
        }

        /** @var list<int> */
        return $space['rent'];
    }

    /**
     * Rent of an unimproved street when the owner has the whole colour group.
     */
    public function setRent(int $position): int
    {
        $space = $this->spaceAt($position);

        if ($space['type'] !== 'street') {
            throw new InvalidArgumentException("Space {$position} is not a street.");
        }

        /** @var list<int> $rent */
        $rent = $space['rent'];

        return $rent[0] * 2;
    }

    public function mortgage(int $position): int
    {
        $space = $this->spaceAt($position);

        if (! $this->isOwnable($space)) {
            throw new InvalidArgumentException("Space {$position} cannot be mortgaged.");
        }

        /** @var int */
        return $space['mortgage'];
    }

    /**
     * Mortgage plus 10%, rounded to a whole amount.
     */
    public function unmortgage(int $position): int
    {
        return (int) round($this->mortgage($position) * 11 / 10);
    }

    /**
     * The four corners plus the nine spaces on each side, in position order.
     *
     * @return array{corners: list<array<string, mixed>>, bottom: list<array<string, mixed>>, left: list<array<string, mixed>>, top: list<array<string, mixed>>, right: list<array<string, mixed>>}
     */
    public function spacesBySide(): array
    {
        return [
            'corners' => array_values(array_filter($this->spaces, fn (array $space): bool => $space['type'] === 'corner')),
            'bottom' => array_slice($this->spaces, 1, 9),
            'left' => array_slice($this->spaces, 11, 9),
            'top' => array_slice($this->spaces, 21, 9),
            'right' => array_slice($this->spaces, 31, 9),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function groupMembers(string $group): array
    {
        return array_values(array_filter(
            $this->spaces,
            fn (array $space): bool => $space['type'] === 'street' && $space['group'] === $group,
        ));
    }

    /**
     * The 28 ownable spaces, in board order.
     *
     * @return list<array<string, mixed>>
     */
    public function deedsFor(): array
    {
        return array_values(array_filter($this->spaces, $this->isOwnable(...)));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function groups(): array
    {
        /** @var list<array<string, mixed>> */
        return $this->data['groups'];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function deck(string $deck): array
    {
        /** @var array<string, list<array<string, mixed>>> $decks */
        $decks = $this->data['decks'];

        return $decks[$deck] ?? throw new InvalidArgumentException("Unknown deck {$deck}.");
    }

    /**
     * @return array<string, mixed>
     */
    public function money(): array
    {
        /** @var array<string, mixed> */
        return $this->data['money'];
    }

    /**
     * @return array<string, mixed>
     */
    public function components(): array
    {
        /** @var array<string, mixed> */
        return $this->data['components'];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function currencies(): array
    {
        /** @var list<array<string, mixed>> */
        return $this->data['currencies'];
    }

    /**
     * `€ 1.500` in Dutch, `€1,500` in English.
     */
    public function formatMoney(int $amount, string $currency, string $locale): string
    {
        $symbol = null;

        foreach ($this->currencies() as $entry) {
            if ($entry['id'] === $currency) {
                $symbol = (string) $entry['symbol'];
            }
        }

        if ($symbol === null) {
            throw new InvalidArgumentException("Unknown currency {$currency}.");
        }

        return match ($locale) {
            'nl' => $symbol . ' ' . number_format($amount, 0, ',', '.'),
            'en' => $symbol . number_format($amount, 0, '.', ','),
            default => throw new InvalidArgumentException("Unknown locale {$locale}."),
        };
    }

    /**
     * @param array<string, mixed> $space
     */
    private function isOwnable(array $space): bool
    {
        return in_array($space['type'], ['street', 'station', 'utility'], true);
    }
}
