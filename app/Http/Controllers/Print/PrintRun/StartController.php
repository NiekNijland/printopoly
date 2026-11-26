<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintRun;

use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Services\PrintStatusService;
use App\Modules\Print\Support\PhotoTargets;
use App\Modules\Print\Support\PrintChoiceInput;
use App\Modules\Print\Support\PrintRunStarter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * "Drukkerij-set maken" or a single part (B95). Only the chosen parts are made
 * (B99).
 */
final class StartController extends Controller
{
    public function __invoke(Request $request, PrintJob $printJob, PrintRunStarter $starter, PrintStatusService $status): JsonResponse
    {
        Gate::authorize('view', $printJob);

        $request->validate([
            'set' => ['required', Rule::enum(PrintSet::class)],
            'parts' => ['required', 'array', 'min:1'],
            'parts.*' => [Rule::enum(PrintPart::class)],
            'targets' => ['nullable', 'array'],
            // The choices of the set travel with the run, so the money and the count are right (bug 6, B156).
            'choices' => ['sometimes', 'array'],
            // The language of the site the user prints from: the instructions and file names follow it (B184).
            'locale' => ['nullable', 'in:' . implode(',', Locale::values())],
            ...PrintChoiceInput::rules('choices.'),
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

        $site = Locale::tryFrom($request->string('locale')->toString());

        if ($site instanceof Locale && $site->value !== $printJob->locale && ! $printJob->isBusy()) {
            $printJob->locale = $site->value;
            $printJob->save();
        }

        $choices = $request->input('choices');

        if (is_array($choices) && ! $printJob->isBusy()) {
            $printJob->rememberChoice($set, PrintChoiceInput::merge($choices, $printJob->choiceFor($set)));
        }

        $starter->start($printJob, $set, $parts, $request->has('targets') ? PhotoTargets::clean($request->input('targets')) : null);

        return response()->json($status->resolve($printJob->fresh() ?? $printJob)->toArray());
    }
}
