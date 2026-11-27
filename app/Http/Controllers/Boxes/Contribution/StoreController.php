<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Contribution;

use App\Http\Requests\Boxes\StoreContributionRequest;
use App\Modules\Boxes\Actions\AddContribution;
use App\Modules\Boxes\Data\ContributionReceiptData;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final readonly class StoreController
{
    public function __invoke(StoreContributionRequest $request, string $token, AddContribution $add): Response
    {
        if ($request->isBot()) {
            return new ContributionReceiptData(id: (string) Str::ulid(), receipt: Str::random(32))->toResponse($request);
        }

        $contribution = $add->handle($token, $request->elementKey(), $request->firstName(), $request->value(), $request->amount(), $request->photo(), (string) $request->ip());

        return new ContributionReceiptData(id: $contribution->publicId(), receipt: $contribution->receipt)->toResponse($request);
    }
}
