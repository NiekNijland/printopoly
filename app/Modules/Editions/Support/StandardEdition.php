<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Support\JsonShape;
use InvalidArgumentException;
use JsonException;
use RuntimeException;
use UnexpectedValueException;

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
        $this->spaces = $data['spaces'];
    }

    public static function load(?string $path = null): self
    {
        $path ??= dirname(__DIR__, 4) . '/resources/data/standard-edition.json';
        $json = file_get_contents($path);

        throw_if($json === false, RuntimeException::class, "Cannot read {$path}.");

        try {
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $jsonException) {
            throw new RuntimeException("Invalid JSON in {$path}.", 0, $jsonException);
        }

        try {
            return new self(self::shape(JsonShape::map($data, 'standard edition')));
        } catch (UnexpectedValueException $unexpectedValueException) {
            throw new RuntimeException("Unexpected data in {$path}.", 0, $unexpectedValueException);
        }
    }

    /**
     * @param array<string, mixed> $data
     * @return Data
     */
    private static function shape(array $data): array
    {
        $decks = [];

        foreach (JsonShape::map($data['decks'] ?? null, 'decks') as $name => $cards) {
            $decks[$name] = array_map(self::card(...), JsonShape::maps($cards, "decks.{$name}"));
        }

        $money = JsonShape::map($data['money'] ?? null, 'money');
        $cash = JsonShape::map($money['startingCash'] ?? null, 'money.startingCash');
        $components = JsonShape::map($data['components'] ?? null, 'components');
        $cardSize = JsonShape::map($components['cardSizeMm'] ?? null, 'components.cardSizeMm');

        return [
            'spaces' => array_map(self::space(...), JsonShape::maps($data['spaces'] ?? null, 'spaces')),
            'groups' => array_map(static fn (array $group): array => ['id' => JsonShape::string($group['id'] ?? null, 'groups[].id'), 'color' => JsonShape::string($group['color'] ?? null, 'groups[].color'), 'name' => JsonShape::localized($group['name'] ?? null, 'groups[].name')], JsonShape::maps($data['groups'] ?? null, 'groups')),
            'decks' => $decks,
            'money' => [
                'notes' => array_map(static fn (array $note): array => ['value' => JsonShape::int($note['value'] ?? null, 'money.notes[].value'), 'count' => JsonShape::int($note['count'] ?? null, 'money.notes[].count'), 'color' => JsonShape::string($note['color'] ?? null, 'money.notes[].color')], JsonShape::maps($money['notes'] ?? null, 'money.notes')),
                'startingCash' => [
                    'total' => JsonShape::int($cash['total'] ?? null, 'money.startingCash.total'),
                    'split' => array_map(static fn (array $part): array => ['value' => JsonShape::int($part['value'] ?? null, 'money.startingCash.split[].value'), 'count' => JsonShape::int($part['count'] ?? null, 'money.startingCash.split[].count')], JsonShape::maps($cash['split'] ?? null, 'money.startingCash.split')),
                ],
            ],
            'components' => [
                'titleDeeds' => JsonShape::int($components['titleDeeds'] ?? null, 'components.titleDeeds'),
                'houses' => JsonShape::int($components['houses'] ?? null, 'components.houses'),
                'hotels' => JsonShape::int($components['hotels'] ?? null, 'components.hotels'),
                'cardSizeMm' => ['width' => JsonShape::int($cardSize['width'] ?? null, 'components.cardSizeMm.width'), 'height' => JsonShape::int($cardSize['height'] ?? null, 'components.cardSizeMm.height')],
            ],
            'currencies' => array_map(static fn (array $currency): array => ['id' => JsonShape::string($currency['id'] ?? null, 'currencies[].id'), 'symbol' => JsonShape::string($currency['symbol'] ?? null, 'currencies[].symbol'), 'name' => JsonShape::localized($currency['name'] ?? null, 'currencies[].name')], JsonShape::maps($data['currencies'] ?? null, 'currencies')),
        ];
    }

    /**
     * @param array<string, mixed> $space
     * @return Space
     */
    private static function space(array $space): array
    {
        $position = JsonShape::int($space['position'] ?? null, 'spaces[].position');
        $at = "spaces[{$position}]";
        $name = JsonShape::localized($space['name'] ?? null, $at . '.name');
        $int = static fn (string $key): int => JsonShape::int($space[$key] ?? null, "{$at}.{$key}");

        return match (JsonShape::string($space['type'] ?? null, $at . '.type')) {
            'street' => ['position' => $position, 'type' => 'street', 'name' => $name, 'group' => JsonShape::string($space['group'] ?? null, $at . '.group'), 'price' => $int('price'), 'rent' => JsonShape::ints($space['rent'] ?? null, $at . '.rent'), 'houseCost' => $int('houseCost'), 'mortgage' => $int('mortgage')],
            'station' => ['position' => $position, 'type' => 'station', 'name' => $name, 'price' => $int('price'), 'rent' => JsonShape::ints($space['rent'] ?? null, $at . '.rent'), 'mortgage' => $int('mortgage')],
            'utility' => ['position' => $position, 'type' => 'utility', 'name' => $name, 'price' => $int('price'), 'multipliers' => JsonShape::ints($space['multipliers'] ?? null, $at . '.multipliers'), 'mortgage' => $int('mortgage')],
            'tax' => ['position' => $position, 'type' => 'tax', 'name' => $name, 'amount' => $int('amount')],
            'corner' => [
                'position' => $position,
                'type' => 'corner',
                'name' => $name,
                'corner' => JsonShape::string($space['corner'] ?? null, $at . '.corner'),
                ...(array_key_exists('salary', $space) ? ['salary' => $int('salary')] : []),
            ],
            'chance' => ['position' => $position, 'type' => 'chance', 'name' => $name],
            'chest' => ['position' => $position, 'type' => 'chest', 'name' => $name],
            default => throw new UnexpectedValueException("{$at}.type is not a type of space."),
        };
    }

    /**
     * @param array<string, mixed> $card
     * @return Card
     */
    private static function card(array $card): array
    {
        $id = JsonShape::string($card['id'] ?? null, 'card.id');
        $shaped = ['id' => $id, 'effect' => JsonShape::localized($card['effect'] ?? null, $id . '.effect'), 'text' => JsonShape::localized($card['text'] ?? null, $id . '.text')];

        return array_key_exists('amount', $card) ? [...$shaped, 'amount' => JsonShape::int($card['amount'], $id . '.amount')] : $shaped;
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
