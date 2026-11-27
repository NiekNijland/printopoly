<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\AnonymousPrintJob;

use App\Http\Requests\Print\StoreAnonymousPrintJobRequest;
use App\Modules\Print\Actions\CreateAnonymousPrintJob;
use App\Modules\Print\Data\PrintJobLinkData;
use App\Modules\Print\Support\PrintEditionReader;
use Symfony\Component\HttpFoundation\Response;

final readonly class StoreController
{
    public function __invoke(StoreAnonymousPrintJobRequest $request, CreateAnonymousPrintJob $create, PrintEditionReader $reader): Response
    {
        $edition = $request->edition($reader);
        $job = $create->handle($edition, $request->editionJson(), $request->targets(), $request->photos(), $request->isPartial(), $request->locale(), $request->previousToken(), (string) $request->ip());

        return new PrintJobLinkData(
            token: $job->token,
            url: route('print.show', ['locale' => $job->locale, 'printJob' => $job]),
            statusUrl: route('print.status', ['printJob' => $job]),
        )->toResponse($request);
    }
}
