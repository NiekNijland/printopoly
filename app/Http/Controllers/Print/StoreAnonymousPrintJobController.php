<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Photos\PhotoRejected;
use App\Photos\PhotoStore;
use App\Print\PhotoTargets;
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
use JsonException;

/**
 * A print job without an account (B80): the browser sends the edition as JSON
 * and the photos it needs, once, for this job. The job is reachable only
 * through the secret token in the link and goes away after 7 days (B62).
 * Active jobs per IP address are limited.
 *
 * Fields: `edition` (JSON text), `targets` (JSON text, optional: the frame size of every visible photo per set), `locale` (the
 * language of the site the user prints from, for the instructions, the file names and the link, B184), and `photos[<ref>]` files, where
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
            'targets' => ['nullable', 'string', 'max:262144'],
            'partial' => ['nullable', 'boolean'],
            'previous' => ['nullable', 'string', 'max:64'],
        ]);

        $json = $request->string('edition')->toString();

        try {
            $edition = PrintEditionData::fromJson($json);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['edition' => __('print.edition_invalid')]);
        }

        $targets = $request->filled('targets') ? $this->targets($request->string('targets')->toString()) : null;
        $uploads = $this->uploads($request);
        // With targets, only the photos that show somewhere are needed.
        // `partial`: the rest of the photos follows in batches, because PHP caps the files per request.
        if (! $request->boolean('partial')) {
            $this->assertAllPhotosPresent($targets === null ? $edition : $edition->withTargets([...$targets['printer'], ...$targets['home']]), $uploads);
        }

        $this->assertIpLimit($request);

        $job = new PrintJob([
            'token' => Str::random(40),
            'user_id' => null,
            'edition_id' => null,
            'edition' => json_decode($json, true, 64, JSON_THROW_ON_ERROR),
            'photo_targets' => $targets,
            'locale' => (Locale::tryFrom($request->string('locale')->toString()) ?? $edition->locale())->value,
            'ip_hash' => hash_hmac('sha256', (string) $request->ip(), config()->string('app.key')),
            'previous_job_id' => $this->previousJob($request),
            'expires_at' => CarbonImmutable::now()->addDays(config()->integer('printopoly.print_files.retention_days')),
        ]);
        $job->save();

        try {
            foreach ($uploads as $ref => $file) {
                $photos->storeForJob((string) $file->getRealPath(), (string) $ref, $job);
            }
        } catch (PhotoRejected $photoRejected) {
            resolve(PrintCleanup::class)->deleteJob($job);

            throw ValidationException::withMessages(['photos' => $photoRejected->translated()]);
        }

        return response()->json([
            'token' => $job->token,
            'url' => route('print.show', ['locale' => $job->locale, 'printJob' => $job]),
            'statusUrl' => route('print.status', ['printJob' => $job]),
        ], 201);
    }

    /**
     * The earlier job of this browser for the same edition, by its secret token (UX 3 of test round 4). Knowing the
     * token is what gives access to a job without an account, so only such a job qualifies.
     */
    private function previousJob(Request $request): ?string
    {
        $token = $request->string('previous')->toString();

        if ($token === '') {
            return null;
        }

        $previous = PrintJob::query()->where('token', $token)->whereNull('user_id')->first();

        return $previous instanceof PrintJob ? $previous->publicId() : null;
    }

    /**
     * @return array<string, array<string, array{w: float, h: float}>>
     */
    private function targets(string $json): array
    {
        try {
            return PhotoTargets::clean(json_decode($json, true, 16, JSON_THROW_ON_ERROR));
        } catch (JsonException) {
            throw ValidationException::withMessages(['targets' => __('print.edition_invalid')]);
        }
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
