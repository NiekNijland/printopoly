<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions;

use App\Actions\Editions\StoreEdition;
use App\Data\EditionSummaryData;
use App\Http\Controllers\Controller;
use App\Models\Edition;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The editions in the account, newest change first, and the account limit
 * (B70) so the browser can show "14 van 20".
 */
final class ListEditionsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $editions = Edition::query()
            ->where('user_id', $user->publicId())
            ->orderBy('updated_at_ms', 'desc')
            ->get()
            ->map(static fn (Edition $edition): array => EditionSummaryData::fromEdition($edition)->toArray())
            ->all();

        return response()->json([
            'editions' => $editions,
            'limit' => StoreEdition::limit(),
        ]);
    }
}
