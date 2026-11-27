<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\CollectionBox;
use App\Modules\Boxes\Enums\BoxCapability;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\ShareImages;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The second way to authorize, next to `can:` (Q-08): a secret in the link instead of an account. The route names its
 * capability (`capability:box-link`) and a request whose secret opens nothing answers 404, before any validation, so a
 * guessed or expired link tells nothing.
 */
final readonly class TokenCapability
{
    public function __construct(
        private BoxAccess $boxes,
        private ShareImages $images,
    ) {
    }

    /**
     * @param Closure(Request): Response $next
     */
    public function handle(Request $request, Closure $next, string $capability): Response
    {
        $opens = match (BoxCapability::from($capability)) {
            BoxCapability::LINK => $this->boxes->linkOpens($this->parameter($request, 'token')),
            BoxCapability::OWNER => $this->boxes->ownedBox($request, $this->parameter($request, 'boxId')) instanceof CollectionBox,
            BoxCapability::SHARE_IMAGE => $this->images->find($this->parameter($request, 'id')) !== null,
        };

        throw_unless($opens, NotFoundHttpException::class);

        return $next($request);
    }

    private function parameter(Request $request, string $name): string
    {
        $value = $request->route($name);

        return is_string($value) ? $value : '';
    }
}
