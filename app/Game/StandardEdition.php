<?php

declare(strict_types=1);

namespace App\Game;

use InvalidArgumentException;
use JsonException;
use RuntimeException;

/**
 * Reader of resources/data/standard-edition.json, the single source of truth for the
 * standard game data (B59). resources/js/lib/render/standard-edition.ts reads the same file.
 *
 * @phpstan-type Localized array{nl: string, en: string}
 * @phpstan-type Street array{position: int, type: 'street', name: Localized, group: string, price: int, rent: list<int>, houseCost: int, mortgage: int}
 * @phpstan-type Station array{position: int, type: 'station', name: Localized, price: int, rent: list<int>, mortgage: int}
 * @phpstan-type Utility array{position: int, type: 'utility', name: Localized, price: int, multipliers: list<int>, mortgage: int}
 * @phpstan-type Ownable Street|Station|Utility
 * @phpstan-type Tax array{position: int, type: 'tax', name: Localized, amount: int}
 * @phpstan-type Corner array{position: int, type: 'corner', name: Localized, corner: string, salary?: int}
 * @phpstan-type DeckSpace array{position: int, type: 'chance'|'chest', name: Localized}
 * @phpstan-type Space Ownable|Tax|Corner|DeckSpace
 * @phpstan-type Card array{id: string, effect: Localized, text: Localized, amount?: int}
 * @phpstan-type Group array{id: string, color: string, name: Localized}
 * @phpstan-type Note array{value: int, count: int, color: string}
 * @phpstan-type Money array{notes: list<Note>, startingCash: array{total: int, split: list<array{value: int, count: int}>}}
 * @phpstan-type Components array{titleDeeds: int, houses: int, hotels: int, cardSizeMm: array{width: int, height: int}}
 * @phpstan-type Currency array{id: string, symbol: string, name: Localized}
 * @phpstan-type Data array{spaces: list<Space>, groups: list<Group>, decks: array<string, list<Card>>, money: Money, components: Components, currencies: list<Currency>}
 */
final readonly class StandardEdition
{
    /** @var list<Space> */
    private array $spaces;

    /**
     * @param Data $data
     */
    private function __construct(private array $data)
    {
        throw_unless(array_is_list($data['spaces']), RuntimeException::class, 'Standard edition data has no spaces list.');

        $this->spaces = $data['spaces'];
    }

    public static function load(?string $path = null): self
    {
        $path ??= dirname(__DIR__, 2) . '/resources/data/standard-edition.json';
        $json = file_get_contents($path);

        throw_if($json === false, RuntimeException::class, "Cannot read {$path}.");

        try {
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $jsonException) {
            throw new RuntimeException("Invalid JSON in {$path}.", 0, $jsonException);
        }

        throw_unless(is_array($data), RuntimeException::class, "Unexpected JSON root in {$path}.");

        /** @var Data $data */
        return new self($data);
    }

    /**
     * @return list<Space>
     */
    public function spaces(): array
    {
        return $this->spaces;
    }

    /**
     * @return Space
     */
    public function spaceAt(int $position): array
    {
        $space = $this->spaces[$position] ?? null;

        throw_if($space === null || $space['position'] !== $position, InvalidArgumentException::class, "No space at position {$position}.");

        return $space;
    }

    /**
     * @return list<Group>
     */
    public function groups(): array
    {
        return $this->data['groups'];
    }

    /**
     * @return list<Card>
     */
    public function deck(string $deck): array
    {
        return $this->data['decks'][$deck] ?? throw new InvalidArgumentException("Unknown deck {$deck}.");
    }

    /**
     * @return Money
     */
    public function money(): array
    {
        return $this->data['money'];
    }

    /**
     * @return Components
     */
    public function components(): array
    {
        return $this->data['components'];
    }

    /**
     * @return list<Currency>
     */
    public function currencies(): array
    {
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
                $symbol = $entry['symbol'];
            }
        }

        throw_if($symbol === null, InvalidArgumentException::class, "Unknown currency {$currency}.");

        return match ($locale) {
            'nl' => $symbol . ' ' . number_format($amount, 0, ',', '.'),
            'en' => $symbol . number_format($amount, 0, '.', ','),
            default => throw new InvalidArgumentException("Unknown locale {$locale}."),
        };
    }
}
