<?php

declare(strict_types=1);

namespace App\Modules\Photos\Actions;

use App\Models\Asset;
use App\Models\Edition;
use App\Models\User;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use App\Modules\Photos\Support\PhotoStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\ValidationException;

/**
 * Photo upload for an edition of a logged-in user (B61, B69, B70). The file's type and size are judged on its content
 * in PhotoProcessor, not on what the browser claims.
 */
final readonly class StoreEditionPhoto
{
    public function __construct(private PhotoStore $photos)
    {
    }

    /**
     * @throws ValidationException
     */
    public function handle(User $user, Edition $edition, string $ref, UploadedFile $file): Asset
    {
        $limit = Config::integer('printopoly.limits.account_storage_megabytes') * 1024 * 1024;
        $used = (int) Asset::query()->where('user_id', $user->publicId())->sum('bytes');

        if ($used >= $limit) {
            throw ValidationException::withMessages(['photo' => __('photo.storage_full')]);
        }

        try {
            // A photo uploaded again under the same ref replaces the old one.
            $previous = Asset::query()
                ->where('user_id', $user->publicId())
                ->where('edition_id', $edition->edition_id)
                ->where('ref', $ref)
                ->first();
            $asset = $this->photos->storeForUser($file->getRealPath(), $ref, $user, $edition);

            if ($previous instanceof Asset) {
                $this->photos->delete($previous);
            }
        } catch (PhotoRejectedException $photoRejectedException) {
            throw ValidationException::withMessages(['photo' => $photoRejectedException->translated()]);
        }

        return $asset;
    }
}
