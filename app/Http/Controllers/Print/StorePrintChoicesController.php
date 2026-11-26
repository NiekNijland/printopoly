<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Http\Controllers\Controller;
use App\Jobs\RefreshPrintTextsJob;
use App\Models\PrintJob;
use App\Print\PrintChoiceInput;
use App\Print\PrintStatusResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Keeps what the print page chose for one set (bug 6 of test round 3, B156): the parts it skips, the amount of play
 * money and the number of sets. Answers with the status, because another amount of money outdates the money PDF.
 */
final class StorePrintChoicesController extends Controller
{
    public function __invoke(Request $request, PrintJob $printJob, PrintStatusResolver $status): JsonResponse
    {
        Gate::authorize('view', $printJob);

        $request->validate([
            'set' => ['required', Rule::enum(PrintSet::class)],
            ...PrintChoiceInput::rules(),
        ]);

        $set = $request->enum('set', PrintSet::class);
        abort_unless($set instanceof PrintSet, 422);

        $before = $printJob->choiceFor($set);
        $after = PrintChoiceInput::merge($request->all(), $before);
        $printJob->rememberChoice($set, $after);

        // Another part list, number of sets, board form or number of invitations: the order sheet and the instructions
        // in the ZIP follow (B185, B243, B244). Only once something is made; a run that is going makes them itself at
        // its end.
        $changed = $before->skipped !== $after->skipped
            || $before->copies !== $after->copies
            || $before->boardForm !== $after->boardForm
            || $before->invitations !== $after->invitations;

        if ($changed && ! $printJob->isBusy() && $this->hasDoneParts($printJob, $set)) {
            dispatch(new RefreshPrintTextsJob($printJob->publicId(), $set->value));
        }

        return response()->json($status->resolve($printJob)->toArray());
    }

    private function hasDoneParts(PrintJob $printJob, PrintSet $set): bool
    {
        return array_any(PrintPart::cases(), fn (PrintPart $part): bool => $printJob->recordedState($set, $part)['status'] === PartStatus::Done);
    }
}
