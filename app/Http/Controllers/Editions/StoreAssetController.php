<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Edition;
use App\Photos\PhotoRejected;
use App\Photos\PhotoStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/**
 * Photo upload for an edition of a logged-in user (B61, B69, B70). The file's
 * type and size are judged on its content in PhotoProcessor, not on what the
 * browser claims.
 */
final class StoreAssetController extends Controller
{
    public function __invoke(Request $request, Edition $edition, PhotoStore $photos): JsonResponse
    {
        Gate::authorize('update', $edition);
        $user = $this->user($request);

        $request->validate([
            'ref' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'photo' => ['required', 'file'],
        ]);

        $limit = config()->integer('printopoly.limits.account_storage_megabytes') * 1024 * 1024;
        $used = (int) Asset::query()->where('user_id', $user->publicId())->sum('bytes');

        if ($used >= $limit) {
            throw ValidationException::withMessages(['photo' => __('photo.storage_full')]);
        }

        $file = $request->file('photo');
        abort_unless($file instanceof UploadedFile && $file->isValid(), 422);

        $ref = $request->string('ref')->toString();

        try {
            // A photo uploaded again under the same ref replaces the old one.
            $previous = Asset::query()
                ->where('user_id', $user->publicId())
                ->where('edition_id', $edition->edition_id)
                ->where('ref', $ref)
                ->first();
            $asset = $photos->storeForUser($file->getRealPath(), $ref, $user, $edition);

            if ($previous instanceof Asset) {
                $photos->delete($previous);
            }
        } catch (PhotoRejected $rejected) {
            throw ValidationException::withMessages(['photo' => $rejected->translated()]);
        }

        return response()->json([
            'id' => $asset->publicId(),
            'ref' => $asset->ref,
            'width' => $asset->original_width,
            'height' => $asset->original_height,
            'previewUrl' => route('api.assets.preview', ['asset' => $asset]),
        ], 201);
    }
}
