<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\StoreEdition;
use App\Modules\Editions\Data\EditionSummaryData;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/**
 * The editions in the account, newest change first, and the account limit
 * (B70) so the browser can show "14 van 20".
 */
final readonly class ListController
{
    public function __invoke(#[CurrentUser] User $user): JsonResponse
    {
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
