<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintPage;

use App\Models\PrintJob;
use App\Modules\Print\Data\PrintJobData;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Services\PrintStatusService;
use App\Modules\Print\Support\PrintChannel;
use App\Modules\Print\Support\PrintJobContext;
use Illuminate\Support\Facades\Config;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The print page (B95) for a job that exists. Rendered client-side only: it
 * is private and its state arrives live.
 */
final readonly class ShowController
{
    public function __invoke(string $locale, PrintJob $printJob, PrintStatusService $status, PrintJobContext $context): Response
    {
        // The {locale} segment is positional; SetLocale has already applied it.
        unset($locale);

        try {
            $edition = $context->edition($printJob);
            $name = $edition->name;
            $cards = $edition->cardCount();
            $enabled = array_map(static fn (PrintPart $part): string => $part->value, $edition->enabledParts());
            $data = $edition->toPrintPayload([]);
        } catch (PrintFailedException) {
            $data = null;
            $name = '';
            $cards = 0;
            $enabled = [];
        }

        return Inertia::render('print/show', [
            'job' => new PrintJobData(
                token: $printJob->token,
                statusUrl: route('print.status', ['printJob' => $printJob]),
                generateUrl: route('print.generate', ['printJob' => $printJob]),
                channel: PrintChannel::data($printJob),
                status: $status->resolve($printJob),
                anonymous: $printJob->isAnonymous(),
                retentionDays: Config::integer('printopoly.print_files.retention_days'),
                choices: $printJob->choicesData(),
            ),
            'edition' => ['name' => $name, 'cards' => $cards, 'parts' => $enabled],
            'editionData' => $data,
            // The edition in the browser that made this job, so the way back leads to its editor.
            'localEditionId' => $this->editorId($printJob),
        ]);
    }

    private function editorId(PrintJob $printJob): ?string
    {
        $id = $printJob->edition_id ?? (is_array($printJob->edition) ? ($printJob->edition['id'] ?? null) : null);

        return is_string($id) && preg_match('/^[A-Za-z0-9_-]{8,64}$/', $id) === 1 ? $id : null;
    }
}
