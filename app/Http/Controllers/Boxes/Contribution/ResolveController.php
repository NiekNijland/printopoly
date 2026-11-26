<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Contribution;

use App\Http\Requests\Boxes\ResolveContributionRequest;
use App\Modules\Boxes\Actions\ResolveContribution;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\JsonResponse;

final readonly class ResolveController
{
    public function __invoke(ResolveContributionRequest $request, string $boxId, string $contributionId, BoxAccess $access, ResolveContribution $resolve, BoxPresenter $presenter): JsonResponse
    {
        $box = $resolve->handle($access->owned($request, $boxId), $contributionId, $request->isAccepted(), $request->parts());

        return response()->json($presenter->owner($box));
    }
}
