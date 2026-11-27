<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\OwnContributionPhoto;

use App\Models\BoxContribution;
use App\Modules\Boxes\Support\BoxAccess;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * A friend sees the preview of their own photo (B128). The key is the receipt that only that friend got when they
 * sent it, together with the box token: another friend's photo has another receipt and is not reachable from here.
 */
final readonly class ShowController
{
    public function __invoke(string $token, string $receipt, BoxAccess $access): StreamedResponse
    {
        $box = $access->liveByLink($token);

        $contribution = BoxContribution::query()
            ->where('box_id', $box->publicId())
            ->where('receipt', $receipt)
            ->first();

        throw_if(! $contribution instanceof BoxContribution || $contribution->disk === null || $contribution->preview_path === null, NotFoundHttpException::class);

        return Storage::disk($contribution->disk)->response($contribution->preview_path, null, ['Cache-Control' => 'private, no-store']);
    }
}
