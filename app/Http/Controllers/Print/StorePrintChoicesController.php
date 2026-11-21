<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Enums\PrintSet;
use App\Http\Controllers\Controller;
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

        $printJob->rememberChoice($set, PrintChoiceInput::merge($request->all(), $printJob->choiceFor($set)));

        return response()->json($status->resolve($printJob)->toArray());
    }
}
