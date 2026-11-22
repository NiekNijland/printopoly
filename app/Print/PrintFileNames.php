<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintJob;
use Illuminate\Support\Str;

/**
 * The names of the downloads (B184): they carry the name of the edition and follow the language of the site the
 * user prints from, so a folder with three editions stays readable ("riso-bedrijfsspel-01-bord.pdf").
 */
final readonly class PrintFileNames
{
    private const int MAX_SLUG = 40;

    private function __construct(public string $slug, public Locale $locale)
    {
    }

    public static function for(PrintJob $job, PrintJobContext $context): self
    {
        try {
            $name = $context->edition($job)->name;
        } catch (PrintFailed) {
            $name = '';
        }

        return new self(self::slug($name), Locale::tryFrom($job->locale) ?? Locale::default());
    }

    public static function slug(string $name): string
    {
        $slug = trim(Str::limit(Str::slug($name), self::MAX_SLUG, ''), '-');

        return $slug === '' ? 'printopoly' : $slug;
    }

    /**
     * One PDF on its own: "riso-bedrijfsspel-bord-drukkerij.pdf".
     */
    public function part(PrintPart $part, PrintSet $set): string
    {
        return $this->slug . '-' . $part->fileName($this->locale) . '-' . $this->setWord($set) . '.pdf';
    }

    /**
     * A PDF in the ZIP, numbered in the order of the print page: "riso-bedrijfsspel-01-bord.pdf".
     */
    public function zipEntry(int $number, PrintPart $part, string $extension = 'pdf', string $suffix = ''): string
    {
        return sprintf('%s-%02d-%s%s.%s', $this->slug, $number, $part->fileName($this->locale), $suffix, $extension);
    }

    /**
     * The instruction of a part in the ZIP, with the number of its PDF: "instructies/01-bord.pdf".
     */
    public function zipInstructions(int $number, PrintPart $part): string
    {
        return $this->instructionFolder() . '/' . sprintf('%02d-%s.pdf', $number, $part->fileName($this->locale));
    }

    /**
     * The instruction of a part on its own: "riso-bedrijfsspel-instructies-bord.pdf".
     */
    public function instructions(PrintPart $part): string
    {
        return $this->slug . '-' . $this->instructionFolder() . '-' . $part->fileName($this->locale) . '.pdf';
    }

    /**
     * The order sheet goes first in the ZIP: "riso-bedrijfsspel-00-bestelblad.pdf" (B185).
     */
    public function orderSheet(): string
    {
        return $this->slug . '-00-' . ($this->locale === Locale::English ? 'order-sheet' : 'bestelblad') . '.pdf';
    }

    public function image(PrintPart $part, int $width): string
    {
        return $this->slug . '-' . $part->fileName($this->locale) . '-' . $width . 'px.png';
    }

    public function zip(PrintSet $set): string
    {
        return $this->slug . '-' . Str::lower($set->zipName($this->locale)) . '.zip';
    }

    private function setWord(PrintSet $set): string
    {
        return match ($this->locale) {
            Locale::Dutch => $set === PrintSet::Printer ? 'drukkerij' : 'thuis',
            Locale::English => $set === PrintSet::Printer ? 'print-shop' : 'home',
        };
    }

    private function instructionFolder(): string
    {
        return $this->locale === Locale::English ? 'instructions' : 'instructies';
    }
}
