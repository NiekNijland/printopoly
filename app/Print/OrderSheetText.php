<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintJob;

/**
 * The order sheet of a set (B185): one page for the print shop or the copy shop with the size, the paper, the
 * finishing, the colour space, the corner radius, the flip edge and the cutting of every part in the set. The text
 * lives in resources/content/{locale}/instructies/bestelblad-{set}.md; a line `{part:board}` starts the section of a
 * part, and only the parts that are made stay, numbered like their PDF in the ZIP. The exact specs live here, so the instructions can use plain words.
 */
final readonly class OrderSheetText
{
    public function __construct(private InstructionText $text, private PrintJobContext $context)
    {
    }

    /**
     * @throws PrintFailed
     */
    public function text(PrintJob $job, PrintSet $set, Locale $locale): string
    {
        $edition = $this->context->edition($job, $set);
        $names = PrintFileNames::for($job, $this->context);
        $choice = $job->choiceFor($set);
        // The parts that are made, in the order and with the numbers of the ZIP.
        $parts = array_values(array_filter(
            PrintPart::production(),
            static fn (PrintPart $part): bool => $job->recordedState($set, $part)['status'] === PartStatus::Done,
        ));

        $sections = preg_split('/^\{part:([a-z_]+)\}\R/m', $this->markdown($set, $locale), -1, PREG_SPLIT_DELIM_CAPTURE);

        if ($sections === false) {
            throw new PrintFailed('The order sheet could not be read.');
        }

        $header = (string) array_shift($sections);
        $out = $this->fillHeader($header, $edition->name, $choice->copies);

        for ($index = 0; $index + 1 < count($sections); $index += 2) {
            $part = PrintPart::tryFrom($sections[$index]);
            $number = $part instanceof PrintPart ? array_search($part, $parts, true) : false;

            if (! $part instanceof PrintPart || $number === false) {
                continue;
            }

            $out .= $this->text->fill($sections[$index + 1], $part, $edition, $locale, $set, 1, [
                ...$this->pageFacts($part, $set, $edition, $locale),
                'file' => $names->zipEntry($number + 1, $part),
            ]);
        }

        return $out;
    }

    private function fillHeader(string $header, string $name, int $copies): string
    {
        $lines = [];

        foreach (explode("\n", $header) as $line) {
            if (str_starts_with($line, '{if:copies_many}')) {
                if ($copies < 2) {
                    continue;
                }

                $line = substr($line, strlen('{if:copies_many}'));
            }

            $lines[] = $line;
        }

        $title = trim($name) === '' ? 'Printopoly' : trim($name);

        return str_replace(['{edition_name}', '{copies}'], [$title, (string) $copies], implode("\n", $lines));
    }

    /**
     * The size of the PDF pages and of the box lid, which the instructions do not name.
     *
     * @return array<string, int|string>
     */
    private function pageFacts(PrintPart $part, PrintSet $set, PrintEditionData $edition, Locale $locale): array
    {
        $expected = PrintLayout::expect($part, $set, $edition);
        $profile = $edition->profile();
        $bleed = config()->float('printopoly.print.bleed_mm');

        return [
            'pdf_w' => InstructionText::millimetres($expected->widthMm, $locale),
            'pdf_h' => InstructionText::millimetres($expected->heightMm, $locale),
            'pdf_pages' => $expected->pages ?? 0,
            'lid_w' => InstructionText::millimetres($profile['boxLidWidth'], $locale),
            'lid_h' => InstructionText::millimetres($profile['boxLidHeight'], $locale),
            'lid_bleed_w' => InstructionText::millimetres($profile['boxLidWidth'] + 2 * $bleed, $locale),
            'lid_bleed_h' => InstructionText::millimetres($profile['boxLidHeight'] + 2 * $bleed, $locale),
        ];
    }

    /**
     * @throws PrintFailed
     */
    private function markdown(PrintSet $set, Locale $locale): string
    {
        $path = resource_path('content/' . $locale->value . '/instructies/bestelblad-' . ($set === PrintSet::Printer ? 'drukkerij' : 'thuisprint') . '.md');
        $content = is_file($path) ? file_get_contents($path) : false;

        if ($content === false) {
            throw new PrintFailed('Order sheet text not found: ' . $path);
        }

        return $content;
    }
}
