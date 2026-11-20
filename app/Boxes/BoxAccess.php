<?php

declare(strict_types=1);

namespace App\Boxes;

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
        $box = preg_match('/^[a-f0-9]{24}$/', $boxId) === 1 ? CollectionBox::query()->find($boxId) : null;

        if (! $box instanceof CollectionBox || $box->expires_at->isPast() || ! $this->owns($request, $box)) {
            throw new NotFoundHttpException();
        }

        return $box;
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
