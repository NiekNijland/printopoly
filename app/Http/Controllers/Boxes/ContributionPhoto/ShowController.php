<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\ContributionPhoto;

use App\Http\Requests\Boxes\ShowContributionPhotoRequest;
use App\Models\BoxContribution;
use App\Modules\Boxes\Support\BoxAccess;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The photo of a contribution, for the box owner only (B128, B68). It is streamed through this route, so the
 * file stays private and the check happens on every request. `?size=preview` is the small version for the list;
 * the default is the print source the owner downloads into the edition when they accept it.
 */
final readonly class ShowController
{
    public function __invoke(ShowContributionPhotoRequest $request, string $boxId, string $contributionId, BoxAccess $access): StreamedResponse
    {
        $box = $access->owned($request, $boxId);
        $contribution = BoxContribution::query()
            ->where('box_id', $box->publicId())
            ->where('_id', $contributionId)
            ->first();

        throw_if(! $contribution instanceof BoxContribution || $contribution->disk === null, NotFoundHttpException::class);

        $path = $request->wantsPreview() ? $contribution->preview_path : $contribution->print_path;

        throw_if($path === null, NotFoundHttpException::class);

        return Storage::disk($contribution->disk)->response($path, null, ['Cache-Control' => 'private, no-store']);
    }
}
