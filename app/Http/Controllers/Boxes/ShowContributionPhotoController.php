<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Boxes\BoxAccess;
use App\Http\Controllers\Controller;
use App\Models\BoxContribution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The photo of a contribution, for the box owner only (B128, B68). It is streamed through this route, so the
 * file stays private and the check happens on every request. `?size=preview` is the small version for the list;
 * the default is the print source the owner downloads into the edition when they accept it.
 */
final class ShowContributionPhotoController extends Controller
{
    public function __invoke(Request $request, string $boxId, string $contributionId, BoxAccess $access): StreamedResponse
    {
        $box = $access->owned($request, $boxId);
        $contribution = BoxContribution::query()
            ->where('box_id', $box->publicId())
            ->where('_id', $contributionId)
            ->first();

        if (! $contribution instanceof BoxContribution || $contribution->disk === null) {
            throw new NotFoundHttpException();
        }

        $path = $request->query('size') === 'preview' ? $contribution->preview_path : $contribution->print_path;

        if ($path === null) {
            throw new NotFoundHttpException();
        }

        return Storage::disk($contribution->disk)->response($path, null, ['Cache-Control' => 'private, no-store']);
    }
}
