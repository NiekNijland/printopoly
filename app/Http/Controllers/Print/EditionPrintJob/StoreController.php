<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\EditionPrintJob;

use App\Http\Requests\Print\StoreEditionPrintJobRequest;
use App\Models\Edition;
use App\Models\User;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Data\PrintJobLinkData;
use App\Modules\Print\Support\EditionPrintJobs;
use Illuminate\Container\Attributes\CurrentUser;
use Symfony\Component\HttpFoundation\Response;

/**
 * The print page of an edition of a logged-in user (B95). There is one job per
 * edition, so the PDFs that are made stay together under Mijn edities. It
 * creates the job only; nothing is generated until the user clicks.
 */
final readonly class StoreController
{
    public function __invoke(#[CurrentUser] User $user, StoreEditionPrintJobRequest $request, Edition $edition, EditionPrintJobs $jobs): Response
    {
        $site = $request->locale() ?? Locale::tryFrom(app()->getLocale()) ?? Locale::default();
        $job = $jobs->forEdition($user, $edition, $site);

        $link = new PrintJobLinkData(
            token: $job->token,
            url: route('print.show', ['locale' => $job->locale, 'printJob' => $job]),
            statusUrl: route('print.status', ['printJob' => $job]),
        );

        return $link->toResponse($request)->setStatusCode($job->wasRecentlyCreated ? Response::HTTP_CREATED : Response::HTTP_OK);
    }
}
