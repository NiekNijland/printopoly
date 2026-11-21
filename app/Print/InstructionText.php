<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\MoneyAmount;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Game\StandardEdition;

/**
 * Fills the numbers and the words of one edition into an instruction text (B64, B135). A text names `{cards}`,
 * `{panel_w}`, `{chance_name}` and the like, and a line that starts with `{if:name}` stays only when that number is
 * not zero, so the instruction says exactly what this edition prints, in its own words (bug 17 and 22 of test
 * round 3). With more than one set, a line under the title says how much that is together.
 */
final readonly class InstructionText
{
    /** The pieces in the standard words of each language; an edition can name its own (B126). */
    private const array BUILDINGS = [
        'nl' => ['house' => 'huisje', 'houses' => 'huisjes', 'hotel' => 'hotel', 'hotels' => 'hotels'],
        'en' => ['house' => 'house', 'houses' => 'houses', 'hotel' => 'hotel', 'hotels' => 'hotels'],
    ];

    public function __construct(private StandardEdition $standard)
    {
    }

    public function fill(string $markdown, PrintPart $part, PrintEditionData $edition, Locale $locale, PrintSet $set = PrintSet::Printer, int $copies = 1): string
    {
        $facts = [...$this->words($edition, $locale), ...$this->partFacts($part, $set, $edition, $locale)];

        $lines = [];
        foreach (explode("\n", $markdown) as $line) {
            if (preg_match('/^\{if:([a-z_]+)\}/', $line, $match) === 1) {
                if (($facts[$match[1]] ?? 0) === 0) {
                    continue;
                }

                $line = substr($line, strlen($match[0]));
            }

            $lines[] = $line;

            // More than one set (a class or a club): right under the title, what all sets take together.
            if ($copies > 1 && str_starts_with($line, '# ')) {
                $lines[] = '';
                $lines[] = $this->copiesLine($part, $set, $edition, $locale, $copies);
            }
        }

        return (string) preg_replace_callback(
            '/\{([a-z_]+)\}/',
            static fn (array $match): string => array_key_exists($match[1], $facts) ? (string) $facts[$match[1]] : $match[0],
            implode("\n", $lines),
        );
    }

    /**
     * The words of the edition: its own names for the decks, Start and the pieces, else the standard ones.
     *
     * @return array<string, string>
     */
    private function words(PrintEditionData $edition, Locale $locale): array
    {
        $own = function (string $key, string $field) use ($edition): ?string {
            $value = $edition->elements[$key][$field] ?? null;

            return is_string($value) && trim($value) !== '' ? trim($value) : null;
        };
        $standardName = function (string $type, int $position = -1) use ($locale): string {
            foreach ($this->standard->spaces() as $space) {
                if ($space['type'] === $type || $space['position'] === $position) {
                    return $space['name'][$locale->value];
                }
            }

            return '';
        };
        $base = self::BUILDINGS[$locale->value];
        $house = $own('words.house', 'name');
        $hotel = $own('words.hotel', 'name');

        return [
            'chance_name' => $own('words.chance', 'name') ?? $standardName('chance'),
            'chest_name' => $own('words.chest', 'name') ?? $standardName('chest'),
            'start' => $own('space.00', 'name') ?? $standardName('', 0),
            'house_word' => $house ?? $base['house'],
            'houses_word' => $own('words.house', 'text') ?? $house ?? $base['houses'],
            'hotel_word' => $hotel ?? $base['hotel'],
            'hotels_word' => $own('words.hotel', 'text') ?? $hotel ?? $base['hotels'],
        ];
    }

    /**
     * @return array<string, int|string>
     */
    private function partFacts(PrintPart $part, PrintSet $set, PrintEditionData $edition, Locale $locale): array
    {
        return match ($part) {
            PrintPart::Cards => $this->cardFacts($edition, $locale),
            PrintPart::Board => $this->boardFacts($edition, $locale),
            PrintPart::Money => $this->moneyFacts($set, $edition, $locale),
            default => [],
        };
    }

    /**
     * The size of the panels and the number of sticker sheets come from the board profile of the edition.
     *
     * @return array<string, int|string>
     */
    private function boardFacts(PrintEditionData $edition, Locale $locale): array
    {
        $profile = $edition->profile();
        $panel = PrintLayout::panelTrim($profile);
        $bleed = config()->float('printopoly.print.bleed_mm');

        return [
            'panels' => $profile['panels'],
            'panel_w' => $this->mm($panel['w'], $locale),
            'panel_h' => $this->mm($panel['h'], $locale),
            'bleed_w' => $this->mm($panel['w'] + 2 * $bleed, $locale),
            'bleed_h' => $this->mm($panel['h'] + 2 * $bleed, $locale),
            'outer' => $this->mm($profile['outer'], $locale),
            'sheets' => PrintLayout::expect(PrintPart::Board, PrintSet::Home, $edition)->pages ?? 0,
        ];
    }

    /**
     * How many notes of each value this set prints (B156), and on how many sheets.
     *
     * @return array<string, int|string>
     */
    private function moneyFacts(PrintSet $set, PrintEditionData $edition, Locale $locale): array
    {
        $amount = $edition->moneyAmountFor($set);
        $split = [];

        foreach ($amount->counts() as $value => $count) {
            $split[] = $count . ' × ' . $value;
        }

        $last = array_pop($split);
        $and = $locale === Locale::English ? ' and ' : ' en ';

        return [
            'notes' => $amount->total(),
            'players' => $this->players($amount, $locale),
            'split' => implode(', ', $split) . $and . $last,
            'sheets' => PrintLayout::expect(PrintPart::Money, $set, $edition)->pages ?? 0,
            'start_money' => $this->money(1500, $edition, $locale),
        ];
    }

    /**
     * An amount in the edition's own currency: its own sign when it has one, else the sign of its currency.
     */
    private function money(int $amount, PrintEditionData $edition, Locale $locale): string
    {
        $currency = $edition->currency ?? ($locale === Locale::English ? 'gbp' : 'eur');
        $formatted = $this->standard->formatMoney($amount, $currency, $locale->value);
        $own = $edition->elements['words.currency']['text'] ?? null;

        if (! is_string($own) || trim($own) === '') {
            return $formatted;
        }

        $standardSymbol = '';
        foreach ($this->standard->currencies() as $entry) {
            if ($entry['id'] === $currency) {
                $standardSymbol = $entry['symbol'];
            }
        }

        $number = ltrim(substr($formatted, strlen($standardSymbol)));

        return trim($own) . ($locale === Locale::English ? '' : "\u{00A0}") . $number;
    }

    private function players(MoneyAmount $amount, Locale $locale): string
    {
        return ($locale === Locale::English ? '2 to ' : '2 tot ') . $amount->maxPlayers();
    }

    /**
     * @return array<string, int|string>
     */
    private function cardFacts(PrintEditionData $edition, Locale $locale): array
    {
        $decks = ($edition->parts['cards'] ?? true) !== false;
        $standard = count($this->standard->deck('chance'));
        $standardChest = count($this->standard->deck('chest'));
        $extra = ['chance' => 0, 'chest' => 0];

        foreach ($edition->extraCardKeys() as $key) {
            $deck = explode('.', $key)[1] ?? '';

            if (array_key_exists($deck, $extra)) {
                $extra[$deck]++;
            }
        }

        $chance = $decks ? $standard + $extra['chance'] : 0;
        $chest = $decks ? $standardChest + $extra['chest'] : 0;
        $home = $edition->cardCount() > 0 ? PrintLayout::expect(PrintPart::Cards, PrintSet::Home, $edition)->pages ?? 0 : 0;

        return [
            'cards' => $edition->cardCount(),
            'chance' => $chance,
            'chest' => $chest,
            'chance_extra' => $decks ? $extra['chance'] : 0,
            'chest_extra' => $decks ? $extra['chest'] : 0,
            'chance_split' => $decks && $extra['chance'] > 0 ? $this->split($standard, $extra['chance'], $locale) : '',
            'chest_split' => $decks && $extra['chest'] > 0 ? $this->split($standardChest, $extra['chest'], $locale) : '',
            'decks' => $chance + $chest,
            'deeds' => ($edition->parts['deeds'] ?? true) !== false ? $this->standard->components()['titleDeeds'] : 0,
            'house_rules' => $edition->hasHouseRules() ? 1 : 0,
            'pages' => $home,
            'sheets' => max(0, intdiv($home - 2, 2)),
        ];
    }

    private function split(int $standard, int $extra, Locale $locale): string
    {
        return $locale === Locale::English
            ? ' (' . $standard . ' standard and ' . $extra . ' extra)'
            : ' (' . $standard . ' standaard en ' . $extra . ' extra)';
    }

    /**
     * "For 3 sets": the quantities below are for one set, and this is what all of them take together.
     */
    private function copiesLine(PrintPart $part, PrintSet $set, PrintEditionData $edition, Locale $locale, int $copies): string
    {
        $total = PrintQuantity::of($part, $set, $edition)->times($copies)->label($locale);

        return $locale === Locale::English
            ? "You are making {$copies} sets. The quantities below are for one set, so print or order everything {$copies} times: {$total} in all."
            : "Je maakt {$copies} sets. De aantallen hieronder zijn voor één set, dus print of bestel alles {$copies} keer: samen {$total}.";
    }

    /**
     * A size in mm without needless decimals, with a decimal comma in Dutch.
     */
    private function mm(float $value, Locale $locale): string
    {
        $rounded = round($value, 1);
        $text = floor($rounded) === $rounded ? (string) (int) $rounded : (string) $rounded;

        return $locale === Locale::English ? $text : str_replace('.', ',', $text);
    }
}
