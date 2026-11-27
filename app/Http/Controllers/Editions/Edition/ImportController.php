<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Requests\Editions\ImportEditionsRequest;
use App\Models\User;
use App\Modules\Editions\Actions\ImportEditions;
use App\Modules\Editions\Data\EditionImportData;
use Illuminate\Container\Attributes\CurrentUser;
use Symfony\Component\HttpFoundation\Response;

/**
 * The one question after login (B81): "Je hebt 2 edities op dit apparaat. Wil
 * je ze in je account bewaren?" On yes the browser sends the editions it
 * keeps. The answer lists what happened per edition id.
 */
final readonly class ImportController
{
    public function __invoke(#[CurrentUser] User $user, ImportEditionsRequest $request, ImportEditions $import): Response
    {
        $report = $import->handle($user, $request->editions());

        return new EditionImportData(imported: $report['imported'], conflicts: $report['conflicts'], overLimit: $report['overLimit'], invalid: $report['invalid'])->toResponse($request)->setStatusCode(Response::HTTP_OK);
    }
}
