<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Enums\Locale;
use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Photos\PhotoRejected;
use App\Photos\PhotoStore;
use App\Print\PrintCleanup;
use App\Print\PrintEditionData;
use App\Print\PrintProgress;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * A print job without an account (B80): the browser sends the edition as JSON
 * and the photos it needs, once, for this job. The job is reachable only
 * through the secret token in the link and goes away after 7 days (B62).
 * Active jobs per IP address are limited.
 *
 * Fields: `edition` (JSON text), `locale`, and `photos[<ref>]` files, where
 * `<ref>` is the id the edition JSON uses for the photo.
 */
final class StoreAnonymousPrintJobController extends Controller
{
    public function __invoke(Request $request, PhotoStore $photos): JsonResponse
    {
        $request->validate([
            'edition' => ['required', 'string', 'max:' . config()->integer('printopoly.limits.edition_json_kilobytes') * 1024],
            'locale' => ['nullable', 'in:' . implode(',', Locale::values())],
            'photos' => ['nullable', 'array', 'max:' . config()->integer('printopoly.limits.anonymous_photos_per_job')],
            'photos.*' => ['file'],
        ]);

        $json = $request->string('edition')->toString();

        try {
            $edition = PrintEditionData::fromJson($json);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['edition' => __('print.edition_invalid')]);
        }

        $uploads = $this->uploads($request);
        $this->assertAllPhotosPresent($edition, $uploads);
        $this->assertIpLimit($request);

        $job = new PrintJob([
            'token' => Str::random(40),
            'user_id' => null,
            'edition_id' => null,
            'edition' => json_decode($json, true, 64, JSON_THROW_ON_ERROR),
            'locale' => (Locale::tryFrom($request->string('locale')->toString()) ?? $edition->locale())->value,
            'ip_hash' => hash_hmac('sha256', (string) $request->ip(), config()->string('app.key')),
            'expires_at' => CarbonImmutable::now()->addDays(config()->integer('printopoly.print_files.retention_days')),
        ]);
        $job->save();

        try {
            foreach ($uploads as $ref => $file) {
                $photos->storeForJob((string) $file->getRealPath(), (string) $ref, $job);
            }
        } catch (PhotoRejected $rejected) {
            app(PrintCleanup::class)->deleteJob($job);

            throw ValidationException::withMessages(['photos' => $rejected->translated()]);
        }

        return response()->json([
            'token' => $job->token,
            'url' => route('print.show', ['locale' => $job->locale, 'printJob' => $job]),
            'statusUrl' => route('print.status', ['printJob' => $job]),
        ], 201);
    }

    /**
     * @return array<int|string, UploadedFile>
     */
    private function uploads(Request $request): array
    {
        $uploads = [];
        $files = $request->file('photos', []);

        foreach (is_array($files) ? $files : [] as $ref => $file) {
            if (! $file instanceof UploadedFile || ! $file->isValid() || preg_match('/^[A-Za-z0-9_-]{8,64}$/', (string) $ref) !== 1) {
                throw ValidationException::withMessages(['photos' => __('photo.unreadable')]);
            }

            $uploads[(string) $ref] = $file;
        }

        return $uploads;
    }

    /**
     * @param array<int|string, UploadedFile> $uploads
     */
    private function assertAllPhotosPresent(PrintEditionData $edition, array $uploads): void
    {
        foreach ($edition->placements() as $placement) {
            if (! isset($uploads[$placement->assetRef])) {
                throw ValidationException::withMessages(['photos' => __('print.photo_missing')]);
            }
        }
    }

    private function assertIpLimit(Request $request): void
    {
        $hash = hash_hmac('sha256', (string) $request->ip(), config()->string('app.key'));
        $busy = PrintJob::query()
            ->where('ip_hash', $hash)
            ->where('active_at', '>', CarbonImmutable::now()->subMinutes(PrintProgress::STALE_AFTER_MINUTES)->toDateTime())
            ->count();

        abort_if($busy >= config()->integer('printopoly.limits.anonymous_jobs_per_ip'), 429);
    }
}
