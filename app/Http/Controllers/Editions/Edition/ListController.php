<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Data\EditionListData;
use App\Modules\Editions\Data\EditionSummaryData;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Support\Facades\Config;

/**
 * The editions in the account, newest change first, and the account limit
 * (B70) so the browser can show "14 van 20".
 */
final readonly class ListController
{
    public function __invoke(#[CurrentUser] User $user): EditionListData
    {
        $editions = Edition::query()
            ->where('user_id', $user->publicId())
            ->orderBy('updated_at_ms', 'desc')
            ->orderBy('_id', 'desc')
            ->get()
            ->map(EditionSummaryData::fromEdition(...))
            ->all();

        return new EditionListData(editions: array_values($editions), limit: Config::integer('printopoly.limits.editions_per_account'));
    }
}
