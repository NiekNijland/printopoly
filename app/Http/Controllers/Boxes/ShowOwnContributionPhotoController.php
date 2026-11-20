<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Http\Controllers\Controller;
use App\Models\BoxContribution;
use App\Models\CollectionBox;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * A friend sees the preview of their own photo (B128). The key is the receipt that only that friend got when they
 * sent it, together with the box token: another friend's photo has another receipt and is not reachable from here.
 */
final class ShowOwnContributionPhotoController extends Controller
{
    public function __invoke(string $token, string $receipt): StreamedResponse
    {
        $box = CollectionBox::query()->where('token', $token)->first();

        if (! $box instanceof CollectionBox || $box->expires_at->isPast() || strlen($receipt) !== 32) {
            throw new NotFoundHttpException();
        }

        $contribution = BoxContribution::query()
            ->where('box_id', $box->publicId())
            ->where('receipt', $receipt)
            ->first();

        if (! $contribution instanceof BoxContribution || $contribution->disk === null || $contribution->preview_path === null) {
            throw new NotFoundHttpException();
        }

        return Storage::disk($contribution->disk)->response($contribution->preview_path, null, ['Cache-Control' => 'private, no-store']);
    }
}
