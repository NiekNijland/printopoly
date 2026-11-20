<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Print\PhotoTargets;
use App\Print\PrintRunStarter;
use App\Print\PrintStatusResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * "Drukkerij-set maken" or a single part (B95). Only the chosen parts are made
 * (B99).
 */
final class StartPrintRunController extends Controller
{
    public function __invoke(Request $request, PrintJob $printJob, PrintRunStarter $starter, PrintStatusResolver $status): JsonResponse
    {
        Gate::authorize('view', $printJob);

        $request->validate([
            'set' => ['required', Rule::enum(PrintSet::class)],
            'parts' => ['required', 'array', 'min:1'],
            'parts.*' => [Rule::enum(PrintPart::class)],
            'targets' => ['nullable', 'array'],
        ]);

        $parts = [];
        foreach ($request->array('parts') as $value) {
            $part = PrintPart::tryFrom(is_string($value) ? $value : '');

            if ($part instanceof PrintPart && ! in_array($part, $parts, true)) {
                $parts[] = $part;
            }
        }

        $set = $request->enum('set', PrintSet::class);
        abort_unless($set instanceof PrintSet, 422);

        $starter->start($printJob, $set, $parts, $request->has('targets') ? PhotoTargets::clean($request->input('targets')) : null);

        return response()->json($status->resolve($printJob->fresh() ?? $printJob)->toArray());
    }
}
