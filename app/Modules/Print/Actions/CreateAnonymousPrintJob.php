<?php

declare(strict_types=1);

namespace App\Modules\Print\Actions;

use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use App\Modules\Photos\Support\PhotoStore;
use App\Modules\Print\Support\PrintCleanup;
use App\Modules\Print\Support\PrintEditionData;
use App\Modules\Print\Support\PrintProgress;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

/**
 * A print job without an account (B80): the browser sends the edition as JSON and the photos it needs, once, for this
 * job. The job is reachable only through the secret token in the link and goes away after 7 days (B62). Active jobs
 * per IP address are limited.
 */
final readonly class CreateAnonymousPrintJob
{
    public function __construct(
        private PhotoStore $photos,
        private PrintCleanup $cleanup,
    ) {
    }

    /**
     * @param array<string, array<string, array{w: float, h: float}>>|null $targets the frame size of every visible photo per set
     * @param array<int|string, UploadedFile> $uploads the photos under the id the edition JSON uses for them
     * @param bool $partial the rest of the photos follows in batches, because PHP caps the files per request
     *
     * @throws ValidationException
     */
    public function handle(PrintEditionData $edition, string $json, ?array $targets, array $uploads, bool $partial, ?Locale $locale, string $previousToken, string $ip): PrintJob
    {
        // With targets, only the photos that show somewhere are needed.
        if (! $partial) {
            $this->assertAllPhotosPresent($targets === null ? $edition : $edition->withTargets([...$targets['printer'], ...$targets['home']]), $uploads);
        }

        $ipHash = hash_hmac('sha256', $ip, Config::string('app.key'));
        $this->assertIpLimit($ipHash);

        $job = new PrintJob([
            'token' => Str::random(40),
            'user_id' => null,
            'edition_id' => null,
            'edition' => json_decode($json, true, 64, JSON_THROW_ON_ERROR),
            'photo_targets' => $targets,
            'locale' => ($locale ?? $edition->locale())->value,
            'ip_hash' => $ipHash,
            'previous_job_id' => $this->previousJob($previousToken),
            'expires_at' => now()->addDays(Config::integer('printopoly.print_files.retention_days')),
        ]);
        $job->save();

        try {
            foreach ($uploads as $ref => $file) {
                $this->photos->storeForJob((string) $file->getRealPath(), (string) $ref, $job);
            }
        } catch (PhotoRejectedException $photoRejectedException) {
            $this->cleanup->deleteJob($job);

            throw ValidationException::withMessages(['photos' => $photoRejectedException->translated()]);
        }

        return $job;
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

    private function assertIpLimit(string $ipHash): void
    {
        $busy = PrintJob::query()
            ->where('ip_hash', $ipHash)
            ->where('active_at', '>', now()->subMinutes(PrintProgress::STALE_AFTER_MINUTES)->toDateTime())
            ->count();

        throw_if($busy >= Config::integer('printopoly.limits.anonymous_jobs_per_ip'), TooManyRequestsHttpException::class);
    }
}
