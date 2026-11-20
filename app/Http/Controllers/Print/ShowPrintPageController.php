<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Data\PrintJobData;
use App\Enums\PrintPart;
use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Print\PrintChannel;
use App\Print\PrintFailed;
use App\Print\PrintJobContext;
use App\Print\PrintStatusResolver;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The print page (B95) for a job that exists. Rendered client-side only: it
 * is private and its state arrives live.
 */
final class ShowPrintPageController extends Controller
{
    public function __invoke(string $locale, PrintJob $printJob, PrintStatusResolver $status, PrintJobContext $context): Response
    {
        // The {locale} segment is positional; SetLocale has already applied it.
        unset($locale);

        Gate::authorize('view', $printJob);

        try {
            $edition = $context->edition($printJob);
            $name = $edition->name;
            $cards = $edition->cardCount();
            $enabled = array_map(static fn (PrintPart $part): string => $part->value, $edition->enabledParts());
            $data = $edition->toPrintPayload([]);
        } catch (PrintFailed) {
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
                retentionDays: config()->integer('printopoly.print_files.retention_days'),
            ),
            'edition' => ['name' => $name, 'cards' => $cards, 'parts' => $enabled],
            'editionData' => $data,
            'localEditionId' => null,
        ]);
    }
}
