<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\AnonymousPrintJob;

use App\Http\Controllers\Controller;
use App\Http\Requests\Print\StoreAnonymousPrintJobRequest;
use App\Models\PrintJob;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use App\Modules\Photos\Support\PhotoStore;
use App\Modules\Print\Support\PrintCleanup;
use App\Modules\Print\Support\PrintEditionData;
use App\Modules\Print\Support\PrintProgress;
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
 */
final class StoreController extends Controller
{
    public function __invoke(StoreAnonymousPrintJobRequest $request, PhotoStore $photos): JsonResponse
    {
        $json = $request->editionJson();

        try {
            $edition = PrintEditionData::fromJson($json);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['edition' => __('print.edition_invalid')]);
        }

        $targets = $request->targets();
        $uploads = $request->photos();
        // With targets, only the photos that show somewhere are needed.
        // `partial`: the rest of the photos follows in batches, because PHP caps the files per request.
        if (! $request->isPartial()) {
            $this->assertAllPhotosPresent($targets === null ? $edition : $edition->withTargets([...$targets['printer'], ...$targets['home']]), $uploads);
        }

        $this->assertIpLimit($request);

        $job = new PrintJob([
            'token' => Str::random(40),
            'user_id' => null,
            'edition_id' => null,
            'edition' => json_decode($json, true, 64, JSON_THROW_ON_ERROR),
            'photo_targets' => $targets,
            'locale' => ($request->locale() ?? $edition->locale())->value,
            'ip_hash' => hash_hmac('sha256', (string) $request->ip(), config()->string('app.key')),
            'previous_job_id' => $this->previousJob($request->previousToken()),
            'expires_at' => CarbonImmutable::now()->addDays(config()->integer('printopoly.print_files.retention_days')),
        ]);
        $job->save();

        try {
            foreach ($uploads as $ref => $file) {
                $photos->storeForJob((string) $file->getRealPath(), (string) $ref, $job);
            }
        } catch (PhotoRejectedException $photoRejectedException) {
            resolve(PrintCleanup::class)->deleteJob($job);

            throw ValidationException::withMessages(['photos' => $photoRejectedException->translated()]);
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
    private function previousJob(string $token): ?string
    {
        if ($token === '') {
            return null;
        }

        $previous = PrintJob::query()->where('token', $token)->whereNull('user_id')->first();

        return $previous instanceof PrintJob ? $previous->publicId() : null;
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
