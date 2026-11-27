<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\AnonymousPrintJob;

use App\Http\Requests\Print\StoreAnonymousPrintJobRequest;
use App\Modules\Print\Actions\CreateAnonymousPrintJob;
use App\Modules\Print\Data\PrintJobLinkData;
use Symfony\Component\HttpFoundation\Response;

final readonly class StoreController
{
    public function __invoke(StoreAnonymousPrintJobRequest $request, CreateAnonymousPrintJob $create): Response
    {
        $edition = $request->edition();
        $job = $create->handle($edition, $request->editionJson(), $request->targets(), $request->photos(), $request->isPartial(), $request->locale(), $request->previousToken(), (string) $request->ip());

        return new PrintJobLinkData(
            token: $job->token,
            url: route('print.show', ['locale' => $job->locale, 'printJob' => $job]),
            statusUrl: route('print.status', ['printJob' => $job]),
        )->toResponse($request);
    }
}
