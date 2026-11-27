<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Asset;

use App\Http\Requests\Editions\StoreAssetRequest;
use App\Models\Edition;
use App\Models\User;
use App\Modules\Photos\Actions\StoreEditionPhoto;
use App\Modules\Photos\Data\EditionPhotoData;
use Illuminate\Container\Attributes\CurrentUser;
use Symfony\Component\HttpFoundation\Response;

final readonly class StoreController
{
    public function __invoke(#[CurrentUser] User $user, StoreAssetRequest $request, Edition $edition, StoreEditionPhoto $store): Response
    {
        $asset = $store->handle($user, $edition, $request->ref(), $request->photo());

        return new EditionPhotoData(
            id: $asset->publicId(),
            ref: $asset->ref,
            width: $asset->original_width,
            height: $asset->original_height,
            previewUrl: route('api.assets.preview', ['asset' => $asset]),
        )->toResponse($request);
    }
}
