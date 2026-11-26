<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\ValueObjects\PrintEdition;
use App\Modules\Print\ValueObjects\PrintQuantity;
use Illuminate\Support\Facades\Config;

/**
 * The order sheet of a set (B185): one page for the print shop or the copy shop with the size, the paper, the
 * finishing, the colour space, the corner radius, the flip edge and the cutting of every part in the set. The top
 * lives in resources/content/{locale}/instructies/bestelblad-{set}.md; the specs of each part come from the text of
 * that part (`## Bestelblad drukkerij`, B205), only for the parts that are made, numbered like their PDF in the ZIP.
 * The exact specs live there, so the instructions and the guide can use plain words.
 */
final readonly class OrderSheetText
{
    public function __construct(private InstructionText $text, private PrintJobContext $context, private PartText $parts)
    {
    }

    /**
     * @throws PrintFailedException
     */
    public function text(PrintJob $job, PrintSet $set, Locale $locale): string
    {
        $edition = $this->context->edition($job, $set);
        $names = PrintFileNames::for($job, $this->context);
        $choice = $job->choiceFor($set);
        // The parts that are made and still in the set, in the order and with the numbers of the ZIP (B210).
        $parts = array_values(array_filter(
            PrintPart::production(),
            static fn (PrintPart $part): bool => $job->recordedState($set, $part)['status'] === PartStatus::Done
                && ! in_array($part, $choice->skipped, true),
        ));

        $out = $this->fillHeader($this->markdown($set, $locale), $edition->name, $choice->copies);

        // Per part the specs from its own text (B205): the same file the guide and the instruction show.
        foreach ($parts as $index => $part) {
            $text = $this->parts->markdown($part, $locale);
            $specs = $this->parts->orderSheet($text, $set);

            if ($specs === '') {
                continue;
            }

            $out .= $this->text->fill("\n## " . $this->parts->title($text) . " ({file})\n\n" . $specs, $part, $edition, $locale, $set, 1, [
                ...$this->pageFacts($part, $set, $edition, $locale),
                ...$this->copyFacts($part, $set, $edition, $locale, $choice->copies),
                'file' => $names->zipEntry($index + 1, $part),
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
    private function pageFacts(PrintPart $part, PrintSet $set, PrintEdition $edition, Locale $locale): array
    {
        $expected = PrintLayout::expect($part, $set, $edition);
        $profile = BoardProfile::of($edition);
        $bleed = Config::float('printopoly.print.bleed_mm');

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
     * With more than one set every quantity says what one set takes and what that is in all (feedback round 6, Ingrid):
     * a shop copies the lines into its order system, and "4 stuks" made one set out of three. `{per_set_total}`
     * follows the number of a row (" per set, 12 in totaal"); the cards and the money hold every set in their PDF
     * (B242), so their rows count everything already and `{copies_many}` adds a row about the set marks.
     *
     * @return array<string, int|string>
     */
    private function copyFacts(PrintPart $part, PrintSet $set, PrintEdition $edition, Locale $locale, int $copies): array
    {
        $many = $copies > 1;
        $perSet = $many && ! PrintEdition::hasSetMarks($part) && $part !== PrintPart::Invitation;
        $total = PrintQuantity::of($part, $set, $edition)->count * $copies;

        return [
            'copies' => $copies,
            'copies_many' => $many ? 1 : 0,
            'per_set_total' => $perSet ? ($locale === Locale::English ? " per set, {$total} in all" : " per set, {$total} in totaal") : '',
        ];
    }

    /**
     * @throws PrintFailedException
     */
    private function markdown(PrintSet $set, Locale $locale): string
    {
        $path = resource_path('content/' . $locale->value . '/instructies/bestelblad-' . ($set === PrintSet::Printer ? 'drukkerij' : 'thuisprint') . '.md');
        $content = is_file($path) ? file_get_contents($path) : false;

        throw_if($content === false, PrintFailedException::class, 'Order sheet text not found: ' . $path);

        return $content;
    }
}
