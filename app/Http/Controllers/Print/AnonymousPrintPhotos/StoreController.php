<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\AnonymousPrintPhotos;

use App\Http\Requests\Print\StoreAnonymousPrintPhotosRequest;
use App\Models\Asset;
use App\Models\PrintJob;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use App\Modules\Photos\Support\PhotoStore;
use App\Modules\Print\Data\StoredPhotosData;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * More photos for a job without an account. PHP accepts only `max_file_uploads` files (20 by default) per
 * request, so the browser sends the photos in batches: the first with the job, the rest here, before it
 * starts a run. The secret token is the permission (B80).
 */
final readonly class StoreController
{
    public function __invoke(StoreAnonymousPrintPhotosRequest $request, PrintJob $printJob, PhotoStore $photos): Response
    {
        $stored = Asset::query()->where('print_job_id', $printJob->publicId())->count();
        if ($stored + $request->photoCount() > Config::integer('printopoly.limits.anonymous_photos_per_job')) {
            throw ValidationException::withMessages(['photos' => __('print.photos_too_many')]);
        }

        try {
            foreach ($request->photos() as $ref => $file) {
                $photos->storeForJob((string) $file->getRealPath(), (string) $ref, $printJob);
            }
        } catch (PhotoRejectedException $photoRejectedException) {
            throw ValidationException::withMessages(['photos' => $photoRejectedException->translated()]);
        }

        return new StoredPhotosData($request->photoCount())->toResponse($request);
    }
}
