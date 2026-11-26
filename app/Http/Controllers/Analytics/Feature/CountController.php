<?php

declare(strict_types=1);

namespace App\Http\Controllers\Analytics\Feature;

use App\Http\Requests\Analytics\CountFeatureRequest;
use App\Modules\Analytics\Enums\FeatureEvent;
use App\Modules\Analytics\Support\FeatureCounter;
use Illuminate\Http\Response;

/**
 * Counts one event from the browser (B206): only the names of `FeatureEvent::fromBrowser()`, anything else is
 * ignored. The route runs without a session or cookies, and the answer is always empty, so it tells nothing back.
 */
final readonly class CountController
{
    public function __invoke(CountFeatureRequest $request, FeatureCounter $counter): Response
    {
        $event = $request->event();

        if ($event instanceof FeatureEvent) {
            $counter->count($event);
        }

        return response()->noContent();
    }
}
