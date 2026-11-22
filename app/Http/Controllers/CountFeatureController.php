<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\FeatureEvent;
use App\Support\FeatureCounter;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Counts one event from the browser (B206): only the names of `FeatureEvent::fromBrowser()`, anything else is
 * ignored. The route runs without a session or cookies, and the answer is always empty, so it tells nothing back.
 */
final class CountFeatureController extends Controller
{
    public function __invoke(Request $request, FeatureCounter $counter): Response
    {
        $event = FeatureEvent::tryFrom($request->string('event')->toString());

        if ($event instanceof FeatureEvent && in_array($event, FeatureEvent::fromBrowser(), true)) {
            $counter->count($event);
        }

        return response()->noContent();
    }
}
