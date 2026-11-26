<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Controllers\Controller;
use App\Http\Requests\Editions\ImportEditionsRequest;
use App\Models\User;
use App\Modules\Editions\Actions\ImportEditions;
use Illuminate\Http\JsonResponse;

/**
 * The one question after login (B81): "Je hebt 2 edities op dit apparaat. Wil
 * je ze in je account bewaren?" On yes the browser sends the editions it
 * keeps. The answer lists what happened per edition id.
 */
final class ImportController extends Controller
{
    public function __invoke(ImportEditionsRequest $request, ImportEditions $import): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return response()->json($import->handle($user, $request->editions()));
    }
}
