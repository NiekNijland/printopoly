<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Game\StandardEdition;

/**
 * Fills the numbers of one edition into an instruction text (B64, B135). The
 * text of the cards names `{cards}`, `{chance}` and the like, and a line that
 * starts with `{if:name}` stays only when that number is not zero, so the
 * instruction says exactly how many cards this edition prints.
 */
final readonly class InstructionText
{
    public function __construct(private StandardEdition $standard)
    {
    }

    public function fill(string $markdown, PrintPart $part, PrintEditionData $edition, Locale $locale): string
    {
        if ($part !== PrintPart::Cards) {
            return $markdown;
        }

        $facts = $this->cardFacts($edition, $locale);

        $lines = [];
        foreach (explode("\n", $markdown) as $line) {
            if (preg_match('/^\{if:([a-z_]+)\}/', $line, $match) === 1) {
                if (($facts[$match[1]] ?? 0) === 0) {
                    continue;
                }

                $line = substr($line, strlen($match[0]));
            }

            $lines[] = $line;
        }

        return (string) preg_replace_callback(
            '/\{([a-z_]+)\}/',
            static fn (array $match): string => array_key_exists($match[1], $facts) ? (string) $facts[$match[1]] : $match[0],
            implode("\n", $lines),
        );
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
}
