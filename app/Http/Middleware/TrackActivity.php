<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Modules\Accounts\Actions\RecordActivity;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records that a logged-in account is in use, for the deletion of unused
 * accounts (B120). The writes are throttled in RecordActivity.
 */
final readonly class TrackActivity
{
    public function __construct(private RecordActivity $recordActivity)
    {
    }

    /**
     * @param Closure(Request): Response $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User) {
            $this->recordActivity->handle($user);
        }

        return $next($request);
    }
}
