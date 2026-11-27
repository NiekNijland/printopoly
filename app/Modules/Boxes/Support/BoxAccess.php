<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Support;

use App\Models\CollectionBox;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Who may manage a box (B128): whoever sends the owner secret in the `X-Box-Owner` header, or the account that
 * made the box. The secret is only ever stored as a hash. A box that is not yours does not exist as far as the
 * answer goes (404), so an id never confirms anything. The friends' token opens nothing here.
 */
final class BoxAccess
{
    public const string HEADER = 'X-Box-Owner';

    public static function hash(string $secret): string
    {
        return hash('sha256', $secret);
    }

    /**
     * @throws NotFoundHttpException
     */
    public function owned(Request $request, string $boxId): CollectionBox
    {
        return $this->ownedBox($request, $boxId) ?? throw new NotFoundHttpException();
    }

    public function ownedBox(Request $request, string $boxId): ?CollectionBox
    {
        $box = preg_match('/^[a-f0-9]{24}$/', $boxId) === 1 ? CollectionBox::query()->find($boxId) : null;

        return $box instanceof CollectionBox && ! $box->expires_at->isPast() && $this->owns($request, $box) ? $box : null;
    }

    public function linkOpens(string $token): bool
    {
        return $this->byLink($token) instanceof CollectionBox || $this->replacedLink($token) instanceof CollectionBox;
    }

    /**
     * @throws NotFoundHttpException
     */
    public function liveByLink(string $token): CollectionBox
    {
        return $this->byLink($token) ?? throw new NotFoundHttpException();
    }

    public function byLink(string $token): ?CollectionBox
    {
        $box = CollectionBox::query()->where('token', $token)->first();

        return $box instanceof CollectionBox && $box->expires_at->isFuture() ? $box : null;
    }

    /**
     * @throws NotFoundHttpException
     */
    public function replacedLinkOrFail(string $token): CollectionBox
    {
        return $this->replacedLink($token) ?? throw new NotFoundHttpException();
    }

    /**
     * The box that remembers this link as one that "Nieuwe link" replaced, while it has not expired.
     */
    public function replacedLink(string $token): ?CollectionBox
    {
        $box = CollectionBox::query()->where('replaced_tokens', CollectionBox::tokenHash($token))->first();

        return $box instanceof CollectionBox && $box->expires_at->isFuture() ? $box : null;
    }

    public function owns(Request $request, CollectionBox $box): bool
    {
        $secret = $request->header(self::HEADER);

        if (is_string($secret) && $secret !== '' && hash_equals($box->owner_hash, self::hash($secret))) {
            return true;
        }

        $user = $request->user();

        return $user instanceof User && $box->user_id !== null && $box->user_id === $user->publicId();
    }
}
