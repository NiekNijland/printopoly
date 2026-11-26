<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintChoices;

use App\Http\Requests\Print\StorePrintChoicesRequest;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Jobs\RefreshPrintTextsJob;
use App\Modules\Print\Services\PrintStatusService;
use App\Modules\Print\Support\PrintChoiceInput;
use Illuminate\Http\JsonResponse;

/**
 * Keeps what the print page chose for one set (bug 6 of test round 3, B156): the parts it skips, the amount of play
 * money and the number of sets. Answers with the status, because another amount of money outdates the money PDF.
 */
final readonly class StoreController
{
    public function __invoke(StorePrintChoicesRequest $request, PrintJob $printJob, PrintStatusService $status): JsonResponse
    {
        $set = $request->set();
        $before = $printJob->choiceFor($set);
        $after = PrintChoiceInput::merge($request->choices(), $before);
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
