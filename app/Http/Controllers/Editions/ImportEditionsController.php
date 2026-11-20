<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions;

use App\Actions\Editions\ImportEditions;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The one question after login (B81): "Je hebt 2 edities op dit apparaat. Wil
 * je ze in je account bewaren?" On yes the browser sends the editions it
 * keeps. The answer lists what happened per edition id.
 */
final class ImportEditionsController extends Controller
{
    /** More than an account can hold, so a full browser still fits in one request. */
    private const int MAX_PER_REQUEST = 50;

    public function __invoke(Request $request, ImportEditions $import): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $request->validate([
            'editions' => ['required', 'array', 'list', 'min:1', 'max:' . self::MAX_PER_REQUEST],
        ]);

        /** @var list<mixed> $editions */
        $editions = $request->json()->all('editions');

        return response()->json($import->handle($user, $editions));
    }
}
