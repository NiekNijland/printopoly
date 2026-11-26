<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\EditionPrint;

use App\Http\Controllers\Controller;
use App\Http\Requests\Print\ShowEditionPrintRequest;
use App\Models\Edition;
use App\Models\User;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Support\EditionPrintJobs;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Where the editor's "Printen" button goes (B95). The owner of a stored edition continues on the
 * page of its job. Anybody else prints an edition that lives in this browser: the page uploads it
 * when they click (B80). An id that is not theirs is treated like an unknown id.
 */
final class ShowController extends Controller
{
    public function __invoke(ShowEditionPrintRequest $request, string $locale, string $edition, EditionPrintJobs $jobs): RedirectResponse|Response
    {
        $user = $request->user();

        if ($user instanceof User) {
            $stored = Edition::query()->where('user_id', $user->publicId())->where('edition_id', $edition)->first();

            if ($stored instanceof Edition) {
                return to_route('print.show', [
                    'locale' => $locale,
                    'printJob' => $jobs->forEdition($user, $stored, Locale::tryFrom($locale) ?? Locale::default()),
                    ...$request->partQuery(),
                ]);
            }
        }

        return Inertia::render('print/show', [
            'job' => null,
            'edition' => ['name' => '', 'cards' => 0, 'parts' => []],
            'editionData' => null,
            'localEditionId' => $edition,
        ]);
    }
}
