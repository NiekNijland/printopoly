<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\AnonymousPrintPhotos;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\PrintJob;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use App\Modules\Photos\Support\PhotoStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * More photos for a job without an account. PHP accepts only `max_file_uploads` files (20 by default) per
 * request, so the browser sends the photos in batches: the first with the job, the rest here, before it
 * starts a run. The secret token is the permission (B80).
 */
final class StoreController extends Controller
{
    public const int BATCH = 10;

    public function __invoke(Request $request, PrintJob $printJob, PhotoStore $photos): JsonResponse
    {
        abort_unless($printJob->isAnonymous(), 404);

        $request->validate([
            'photos' => ['required', 'array', 'max:' . self::BATCH],
            'photos.*' => ['file'],
        ]);

        $stored = Asset::query()->where('print_job_id', $printJob->publicId())->count();
        $files = $request->file('photos', []);
        $files = is_array($files) ? $files : [];

        if ($stored + count($files) > config()->integer('printopoly.limits.anonymous_photos_per_job')) {
            throw ValidationException::withMessages(['photos' => __('print.photos_too_many')]);
        }

        try {
            foreach ($files as $ref => $file) {
                if (! $file->isValid() || preg_match('/^[A-Za-z0-9_-]{8,64}$/', (string) $ref) !== 1) {
                    throw ValidationException::withMessages(['photos' => __('photo.unreadable')]);
                }

                $photos->storeForJob((string) $file->getRealPath(), (string) $ref, $printJob);
            }
        } catch (PhotoRejectedException $photoRejectedException) {
            throw ValidationException::withMessages(['photos' => $photoRejectedException->translated()]);
        }

        return response()->json(['stored' => count($files)], 201);
    }
}
