<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintFile;
use App\Models\PrintJob;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * The instruction PDF of a part, from resources/content/{locale}/instructies
 * (B64). One per part: the text covers both sets. It is made once per job and
 * language and reused until the text or the release changes.
 */
final readonly class InstructionPdfBuilder
{
    public function __construct(private PdfRenderer $renderer, private PdfInspector $inspector)
    {
    }

    /**
     * @throws PrintFailed
     */
    public function ensure(PrintJob $job, PrintPart $part, Locale $locale, PrintSet $set = PrintSet::Printer): PrintFile
    {
        $markdown = $this->forSet($this->markdown($part, $locale), $set);
        $cacheKey = hash('sha256', $locale->value . '|' . $set->value . '|' . PrintRelease::current() . '|' . $markdown);

        $existing = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_INSTRUCTIONS)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->first();

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
        $path = 'print/' . $job->publicId() . '/' . substr($cacheKey, 0, 12) . '-instructions-' . $set->value . '-' . $part->value . '.pdf';
        Storage::disk($disk)->put($path, $bytes);

        $days = config()->integer('printopoly.print_files.retention_days');
        $file = new PrintFile([
            'print_job_id' => $job->publicId(),
            'kind' => PrintFile::KIND_INSTRUCTIONS,
            'part' => $part->value,
            'set' => $set->value,
            'cache_key' => $cacheKey,
            'disk' => $disk,
            'path' => $path,
            'filename' => ($locale === Locale::English ? 'instructions-' : 'instructies-') . $part->fileName($locale) . '.pdf',
            'bytes' => strlen($bytes),
            'pages' => $pages,
            'expires_at' => CarbonImmutable::now()->addDays($days),
        ]);
        $file->save();

        return $file;
    }

    /**
     * The instruction of one set: the text says "Drukkerij-set" and "Thuisprint-set" in two sections, and
     * a reader of one set must not have to read past the other (ronde 2). Sections that are about neither stay.
     */
    private function forSet(string $markdown, PrintSet $set): string
    {
        $other = $set === PrintSet::Printer
            ? '/^##\s+(Thuisprint-set|Home-print set)\s*$/'
            : '/^##\s+(Drukkerij-set|Print-shop set)\s*$/';
        $sections = preg_split('/^(?=## )/m', $markdown);

        if ($sections === false) {
            return $markdown;
        }

        return implode('', array_filter($sections, static fn (string $section): bool => preg_match($other, explode("\n", $section)[0]) !== 1));
    }

    /**
     * @throws PrintFailed
     */
    private function markdown(PrintPart $part, Locale $locale): string
    {
        $path = resource_path('content/' . $locale->value . '/instructies/' . $part->instructionSlug() . '.md');
        $content = is_file($path) ? file_get_contents($path) : false;

        if ($content === false) {
            throw new PrintFailed('Instruction text not found: ' . $path);
        }

        return $content;
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
