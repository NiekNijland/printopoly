<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;

/**
 * The one text per part (B205): resources/content/{locale}/instructies/{slug}.md. The print guide, the instruction
 * PDF in the ZIP and the order sheet are all made from it, so they never say different things.
 *
 * A part file has a title (`# Bord`), an intro, a section per set (`## Drukkerij-set`, `## Thuisprint-set`), maybe
 * sections that hold for both, and per set the exact specs for the order sheet (`## Bestelblad drukkerij`,
 * `## Bestelblad thuisprint`). The plain words are for people; the specs on the order sheet are for the printer.
 */
final class PartText
{
    /** The parts in the order of the print page and the guide, with the test sheet first. */
    public const array GUIDE_ORDER = [
        PrintPart::CALIBRATION,
        PrintPart::BOARD,
        PrintPart::CARDS,
        PrintPart::MONEY,
        PrintPart::TOKENS,
        PrintPart::BOX_LID,
        PrintPart::INVITATION,
        PrintPart::RULES_BOOKLET,
    ];

    private const string PRINTER_SECTION = '/^##\s+(Drukkerij-set|Print-shop set)\s*$/';

    private const string HOME_SECTION = '/^##\s+(Thuisprint-set|Home-print set)\s*$/';

    private const string ORDER_SECTION = '/^##\s+(Bestelblad|Order sheet)\b/';

    private const string ORDER_PRINTER = '/^##\s+(Bestelblad drukkerij|Order sheet print shop)\s*$/';

    /**
     * The file as it is, front matter included.
     *
     * @throws PrintFailedException
     */
    public function markdown(PrintPart $part, Locale $locale): string
    {
        $path = resource_path('content/' . $locale->value . '/instructies/' . $part->instructionSlug() . '.md');
        $content = is_file($path) ? file_get_contents($path) : false;

        throw_if($content === false, PrintFailedException::class, 'Instruction text not found: ' . $path);

        return $content;
    }

    /**
     * The instruction of one set: the title, the intro, the section of that set and the sections about both. A
     * reader of one set must not have to read past the other (ronde 2), and the order-sheet specs stay out.
     */
    public function forSet(string $markdown, PrintSet $set): string
    {
        $other = $set === PrintSet::PRINTER ? self::HOME_SECTION : self::PRINTER_SECTION;

        return implode('', array_filter(
            $this->sections($markdown),
            fn (string $section): bool => ! $this->heads($section, $other) && ! $this->heads($section, self::ORDER_SECTION),
        ));
    }

    /**
     * The specs of the part on the order sheet of a set: the table under `## Bestelblad …`, without the heading.
     * Empty when the part has none.
     */
    public function orderSheet(string $markdown, PrintSet $set): string
    {
        foreach ($this->sections($markdown) as $section) {
            if (! $this->heads($section, self::ORDER_SECTION)) {
                continue;
            }

            $printer = $this->heads($section, self::ORDER_PRINTER);

            if ($printer === ($set === PrintSet::PRINTER)) {
                return trim(explode("\n", $section, 2)[1] ?? '') . "\n";
            }
        }

        return '';
    }

    /**
     * The title of the part (`# Bord`).
     */
    public function title(string $markdown): string
    {
        return preg_match('/^# (.+)$/m', $this->body($markdown), $match) === 1 ? trim($match[1]) : '';
    }

    /**
     * The part as a section of the print guide: `## Title {#part-board}`, the intro, and one `###` block per set,
     * each filled in by `$fill` for its own set (the money of a home set differs from that of a print-shop set).
     * Sections about both sets follow; the order-sheet specs stay on the order sheet.
     *
     * @param callable(string, PrintSet): string $fill
     */
    public function forGuide(string $markdown, PrintPart $part, callable $fill): string
    {
        $out = '';

        foreach ($this->sections($this->body($markdown)) as $section) {
            if ($this->heads($section, self::ORDER_SECTION)) {
                continue;
            }

            $set = match (true) {
                $this->heads($section, self::PRINTER_SECTION) => PrintSet::PRINTER,
                $this->heads($section, self::HOME_SECTION) => PrintSet::HOME,
                default => PrintSet::HOME,
            };

            // One level down: the part is a "##" section of the guide and each set a "###" block in it.
            $shifted = (string) preg_replace('/^(#{1,5}) /m', '#$1 ', $fill($section, $set));
            $out .= (string) preg_replace('/^## (.+)$/m', '## $1 {#part-' . $part->value . '}', $shifted, 1);
        }

        return $out;
    }

    /**
     * The text without its front matter.
     */
    private function body(string $markdown): string
    {
        return preg_match('/\A---\R.*?\R---\R/s', $markdown, $match) === 1 ? mb_substr($markdown, mb_strlen($match[0])) : $markdown;
    }

    /**
     * The text cut before every "##" heading; the first piece is everything before the first one.
     *
     * @return list<string>
     */
    private function sections(string $markdown): array
    {
        $sections = preg_split('/^(?=## )/m', $markdown);

        return $sections === false ? [$markdown] : $sections;
    }

    private function heads(string $section, string $pattern): bool
    {
        return preg_match($pattern, explode("\n", $section, 2)[0]) === 1;
    }
}
