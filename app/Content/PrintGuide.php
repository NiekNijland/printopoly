<?php

declare(strict_types=1);

namespace App\Content;

use App\Data\ContentPageData;
use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\InstructionText;
use App\Print\PartText;
use App\Print\PrintEditionData;

/**
 * The print guide (B67, B205): the one place that explains printing. resources/content/{locale}/printgids.md holds
 * what goes for every part (what you need at home, what to do when something goes wrong), and the line `{parts}`
 * takes a section per part from the same texts the instruction PDFs and the order sheet are made of. The numbers
 * are those of the standard edition; the instruction in the ZIP says them for your own edition.
 *
 * Each part section has the id `part-{part}` (`part-board`), so the print page links to it.
 */
final readonly class PrintGuide
{
    public function __construct(private ContentLibrary $content, private PartText $parts, private InstructionText $text)
    {
    }

    public function page(Locale $locale): ContentPageData
    {
        return $this->content->pageFrom($this->markdown($locale));
    }

    public function markdown(Locale $locale): string
    {
        $edition = PrintEditionData::fromArray(['language' => $locale->value, 'elements' => []]);
        $sections = '';

        foreach (PartText::GUIDE_ORDER as $part) {
            $sections .= $this->parts->forGuide(
                $this->parts->markdown($part, $locale),
                $part,
                fn (string $section, PrintSet $set): string => $part === PrintPart::Calibration
                    ? $section
                    : $this->text->fill($section, $part, $edition, $locale, $set),
            ) . "\n";
        }

        return str_replace("{parts}\n", $sections, $this->content->read($locale->value . '/printgids.md'));
    }
}
