<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Http\Controllers\Controller;
use App\Models\Edition;
use App\Models\User;
use App\Print\EditionPrintJobs;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Where the editor's "Printen" button goes (B95). The owner of a stored edition continues on the
 * page of its job. Anybody else prints an edition that lives in this browser: the page uploads it
 * when they click (B80). An id that is not theirs is treated like an unknown id.
 */
final class ShowEditionPrintController extends Controller
{
    public function __invoke(Request $request, string $locale, string $edition, EditionPrintJobs $jobs): RedirectResponse|Response
    {
        $user = $request->user();

        if ($user instanceof User) {
            $stored = Edition::query()->where('user_id', $user->publicId())->where('edition_id', $edition)->first();

            if ($stored instanceof Edition) {
                return redirect()->route('print.show', ['locale' => $locale, 'printJob' => $jobs->forEdition($user, $stored)]);
            }
        }

        return Inertia::render('print/show', [
            'job' => null,
            'edition' => ['name' => '', 'cards' => 0, 'parts' => []],
            'localEditionId' => $edition,
        ]);
    }
}
