<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\BoardForm;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Modules\Content\Enums\Locale;

/**
 * How much one part takes: sheets of paper at home, and at the print shop what you order (panels, cards, a
 * booklet). The same count as `partQuantity` in resources/js/lib/print/estimate.ts, from the same page plan. It counts
 * one set, also when the PDF holds more sets with their set marks (B242). The invitations follow the number chosen on
 * the print page, four to a sheet at home (B244).
 */
final readonly class PrintQuantity
{
    /**
     * @param 'sheet'|'panel'|'board'|'card'|'booklet'|'invitation'|'piece' $unit
     */
    public function __construct(
        public int $count,
        public string $unit,
        public ?string $paper,
    ) {
    }

    /** Invitations on one A4 sheet at home. */
    public const int INVITATIONS_PER_SHEET = 4;

    public static function of(PrintPart $part, PrintSet $set, PrintEditionData $edition): self
    {
        $expected = PrintLayout::expect($part, $set, $edition->oneSet());
        $pages = $expected->pages ?? 1;

        if ($part === PrintPart::Invitation) {
            return $set === PrintSet::Home
                ? new self((int) ceil($edition->invitations / self::INVITATIONS_PER_SHEET), 'sheet', 'A4')
                : new self($edition->invitations, 'invitation', null);
        }

        if ($set === PrintSet::Home) {
            // Cards and the booklet are printed on both sides: two pages of the PDF are one sheet.
            $duplex = in_array($part, [PrintPart::Cards, PrintPart::RulesBooklet], true);

            return new self($duplex ? (int) ceil($pages / 2) : $pages, 'sheet', self::paper($expected->widthMm, $expected->heightMm));
        }

        return match ($part) {
            PrintPart::Board => $edition->boardForm === BoardForm::Whole ? new self(1, 'board', null) : new self($pages, 'panel', null),
            PrintPart::Cards => new self(intdiv($pages, 2), 'card', null),
            PrintPart::RulesBooklet => new self(1, 'booklet', null),
            PrintPart::BoxLid => new self(1, 'piece', null),
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
                'board' => $one ? 'whole board' : 'whole boards',
                'card' => $one ? 'card' : 'cards',
                'booklet' => $one ? 'booklet' : 'booklets',
                'invitation' => $one ? 'invitation' : 'invitations',
                'piece' => $one ? 'piece' : 'pieces',
            }
            : match ($this->unit) {
                'sheet' => $one ? 'vel' : 'vellen',
                'panel' => $one ? 'paneel' : 'panelen',
                'board' => $one ? 'heel bord' : 'hele borden',
                'card' => $one ? 'kaart' : 'kaarten',
                'booklet' => $one ? 'boekje' : 'boekjes',
                'invitation' => $one ? 'uitnodiging' : 'uitnodigingen',
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
