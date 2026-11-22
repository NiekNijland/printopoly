<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintFile;
use App\Models\PrintJob;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * The instruction PDF of a part, from resources/content/{locale}/instructies
 * (B64), the same text the print guide shows (B205, `PartText`). It is made once per job and
 * language and reused until the text or the release changes.
 */
final readonly class InstructionPdfBuilder
{
    private const string ORDER_SHEET = 'order_sheet';

    public function __construct(
        private PdfRenderer $renderer,
        private PdfInspector $inspector,
        private PrintJobContext $context,
        private InstructionText $text,
        private OrderSheetText $orderSheet,
        private PartText $parts,
    ) {
    }

    /**
     * @throws PrintFailed
     */
    public function ensure(PrintJob $job, PrintPart $part, Locale $locale, PrintSet $set = PrintSet::Printer): PrintFile
    {
        $markdown = $this->text($job, $part, $locale, $set);
        $filename = ($locale === Locale::English ? 'instructions-' : 'instructies-') . $part->fileName($locale) . '.pdf';

        return $this->stored($job, PrintFile::KIND_INSTRUCTIONS, $part->value, $set, $locale, $markdown, $filename);
    }

    /**
     * The texts of a set as they should be now: the instructions of every part that is done, in the language of the
     * site (B184) and with the number of sets, and the order sheet (B185). Text that did not change is reused, so
     * this costs nothing when nothing changed. A failure is reported and never fails a part.
     */
    public function refreshSet(PrintJob $job, PrintSet $set, Locale $locale): void
    {
        $made = false;

        foreach (PrintPart::cases() as $part) {
            if ($job->recordedState($set, $part)['status'] !== PartStatus::Done) {
                continue;
            }

            $made = $made || $part !== PrintPart::Calibration;

            try {
                $this->ensure($job, $part, $locale, $set);
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        // The order sheet belongs to a ZIP, so only once a part for one is made.
        if (! $made) {
            return;
        }

        try {
            $this->ensureOrderSheet($job, $set, $locale);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    /**
     * The order sheet of a set (B185), made after every run so it lists what the ZIP holds.
     *
     * @throws PrintFailed
     */
    public function ensureOrderSheet(PrintJob $job, PrintSet $set, Locale $locale): PrintFile
    {
        $markdown = $this->orderSheet->text($job, $set, $locale);

        return $this->stored($job, PrintFile::KIND_ORDER_SHEET, self::ORDER_SHEET, $set, $locale, $markdown, ($locale === Locale::English ? 'order-sheet' : 'bestelblad') . '.pdf');
    }

    /**
     * The order sheet of a set when it still says what the set holds now; null when the choices changed since, so
     * the ZIP never carries a sheet that lists a part it left out. Reads text only: no Chrome in a web request. The ZIP
     * makes a missing sheet itself (`PrintZipBuilder`), which only happens right after the choices changed.
     */
    public function currentOrderSheet(PrintJob $job, PrintSet $set, Locale $locale): ?PrintFile
    {
        try {
            $cacheKey = $this->cacheKey($set, $locale, $this->orderSheet->text($job, $set, $locale));
        } catch (PrintFailed) {
            return null;
        }

        $file = $this->existing($job, PrintFile::KIND_ORDER_SHEET, self::ORDER_SHEET, $set);

        return $file instanceof PrintFile && $file->cache_key === $cacheKey && Storage::disk($file->disk)->exists($file->path) ? $file : null;
    }

    private function cacheKey(PrintSet $set, Locale $locale, string $markdown): string
    {
        return hash('sha256', $locale->value . '|' . $set->value . '|' . PrintRelease::current() . '|' . $markdown);
    }

    private function existing(PrintJob $job, string $kind, string $part, PrintSet $set): ?PrintFile
    {
        $file = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', $kind)
            ->where('part', $part)
            ->where('set', $set->value)
            ->first();

        return $file instanceof PrintFile ? $file : null;
    }

    /**
     * Renders the text to an A4 PDF and keeps it, or reuses the one made from the same text.
     *
     * @throws PrintFailed
     */
    private function stored(PrintJob $job, string $kind, string $part, PrintSet $set, Locale $locale, string $markdown, string $filename): PrintFile
    {
        $cacheKey = $this->cacheKey($set, $locale, $markdown);
        $existing = $this->existing($job, $kind, $part, $set);

        if ($existing instanceof PrintFile && $existing->cache_key === $cacheKey && Storage::disk($existing->disk)->exists($existing->path)) {
            return $existing;
        }

        if ($existing instanceof PrintFile) {
            Storage::disk($existing->disk)->delete($existing->path);
            $existing->delete();
        }

        [$title, $body] = $this->parse($markdown);
        $html = view('print.instructions', ['locale' => $locale->value, 'title' => $title, 'body' => $body])->render();
        $bytes = $this->renderer->render($html, 210, 297, false);

        $temporary = tempnam(sys_get_temp_dir(), 'printopoly-');
        if ($temporary === false) {
            throw new PrintFailed('No temporary file for the PDF check.');
        }

        try {
            file_put_contents($temporary, $bytes);
            $pages = $this->inspector->assertA4($temporary);
        } finally {
            @unlink($temporary);
        }

        $disk = config()->string('printopoly.storage.disk');
        $path = 'print/' . $job->publicId() . '/' . substr($cacheKey, 0, 12) . '-' . $kind . '-' . $set->value . '-' . $part . '.pdf';
        Storage::disk($disk)->put($path, $bytes);

        $days = config()->integer('printopoly.print_files.retention_days');
        $file = new PrintFile([
            'print_job_id' => $job->publicId(),
            'kind' => $kind,
            'part' => $part,
            'set' => $set->value,
            'cache_key' => $cacheKey,
            'disk' => $disk,
            'path' => $path,
            'filename' => $filename,
            'bytes' => strlen($bytes),
            'pages' => $pages,
            'expires_at' => CarbonImmutable::now()->addDays($days),
        ]);
        $file->save();

        return $file;
    }

    /**
     * The instruction text of one part and set, with the numbers of the job's edition filled in.
     *
     * @throws PrintFailed
     */
    public function text(PrintJob $job, PrintPart $part, Locale $locale, PrintSet $set = PrintSet::Printer): string
    {
        $markdown = $this->parts->forSet($this->parts->markdown($part, $locale), $set);

        // The test sheet is the same for everyone and for one set; the rest follows the edition and the set.
        if ($part === PrintPart::Calibration) {
            return $markdown;
        }

        return $this->text->fill($markdown, $part, $this->context->edition($job, $set), $locale, $set, $job->choiceFor($set)->copies);
    }

    /**
     * Splits off the front matter and renders the rest.
     *
     * @return array{string, string} Title and HTML body.
     */
    private function parse(string $markdown): array
    {
        $title = 'Printopoly';

        if (preg_match('/\A---\R(.*?)\R---\R/s', $markdown, $matches) === 1) {
            if (preg_match('/^title:\s*(.+)$/m', $matches[1], $titleMatch) === 1) {
                $title = trim($titleMatch[1]);
            }

            $markdown = substr($markdown, strlen($matches[0]));
        }

        return [$title, Str::markdown($markdown, ['html_input' => 'strip', 'allow_unsafe_links' => false])];
    }
}
