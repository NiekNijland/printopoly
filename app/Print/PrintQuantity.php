<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;

/**
 * How much one part takes: sheets of paper at home, and at the print shop what you order (panels, cards, a
 * booklet). The same count as `partQuantity` in resources/js/lib/print/estimate.ts, from the same page plan.
 */
final readonly class PrintQuantity
{
    /**
     * @param 'sheet'|'panel'|'card'|'booklet'|'piece' $unit
     */
    public function __construct(
        public int $count,
        public string $unit,
        public ?string $paper,
    ) {
    }

    public static function of(PrintPart $part, PrintSet $set, PrintEditionData $edition): self
    {
        $expected = PrintLayout::expect($part, $set, $edition);
        $pages = $expected->pages ?? 1;

        if ($set === PrintSet::Home) {
            // Cards and the booklet are printed on both sides: two pages of the PDF are one sheet.
            $duplex = in_array($part, [PrintPart::Cards, PrintPart::RulesBooklet], true);

            return new self($duplex ? (int) ceil($pages / 2) : $pages, 'sheet', self::paper($expected->widthMm, $expected->heightMm));
        }

        return match ($part) {
            PrintPart::Board => new self($pages, 'panel', null),
            PrintPart::Cards => new self(intdiv($pages, 2), 'card', null),
            PrintPart::RulesBooklet => new self(1, 'booklet', null),
            PrintPart::BoxLid, PrintPart::Invitation => new self(1, 'piece', null),
            default => new self($pages, 'sheet', self::paper($expected->widthMm, $expected->heightMm)),
        };
    }

    public function times(int $copies): self
    {
        return new self($this->count * $copies, $this->unit, $this->paper);
    }

    public function label(Locale $locale): string
    {
        $one = $this->count === 1;
        $word = $locale === Locale::English
            ? match ($this->unit) {
                'sheet' => $one ? 'sheet' : 'sheets',
                'panel' => $one ? 'panel' : 'panels',
                'card' => $one ? 'card' : 'cards',
                'booklet' => $one ? 'booklet' : 'booklets',
                'piece' => $one ? 'piece' : 'pieces',
            }
            : match ($this->unit) {
                'sheet' => $one ? 'vel' : 'vellen',
                'panel' => $one ? 'paneel' : 'panelen',
                'card' => $one ? 'kaart' : 'kaarten',
                'booklet' => $one ? 'boekje' : 'boekjes',
                'piece' => $one ? 'stuk' : 'stuks',
            };

        return trim($this->count . ' ' . $word . ' ' . ($this->paper ?? ''));
    }

    private static function paper(float $width, float $height): ?string
    {
        $short = (int) round(min($width, $height));
        $long = (int) round(max($width, $height));

        return match ([$short, $long]) {
            [210, 297] => 'A4',
            [297, 420] => 'A3',
            [320, 450] => 'SRA3',
            default => null,
        };
    }
}
