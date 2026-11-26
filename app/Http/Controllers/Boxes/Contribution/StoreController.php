<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Contribution;

use App\Http\Requests\Boxes\StoreContributionRequest;
use App\Modules\Boxes\Actions\AddContribution;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

final readonly class StoreController
{
    public function __invoke(StoreContributionRequest $request, string $token, AddContribution $add): JsonResponse
    {
        if ($request->isBot()) {
            return response()->json(['id' => (string) Str::ulid(), 'receipt' => Str::random(32)], 201);
        }

        $contribution = $add->handle($token, $request->elementKey(), $request->firstName(), $request->value(), $request->amount(), $request->photo(), (string) $request->ip());

        return response()->json(['id' => $contribution->publicId(), 'receipt' => $contribution->receipt], 201);
    }
}
