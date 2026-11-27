<?php

declare(strict_types=1);

namespace App\Modules\Photos\Support;

use App\Models\Asset;
use App\Models\Edition;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Validates an uploaded file, stores its two derived images and records the
 * asset (B61, B68). The original is never kept.
 */
final readonly class PhotoStore
{
    public function __construct(private PhotoProcessor $processor)
    {
    }

    /**
     * @throws PhotoRejectedException
     */
    public function storeForUser(string $path, string $ref, User $user, Edition $edition): Asset
    {
        return $this->store($path, $ref, [
            'user_id' => $user->publicId(),
            'edition_id' => $edition->edition_id,
        ]);
    }

    /**
     * Photos of a job without an account go away with the job (B80).
     *
     * @throws PhotoRejectedException
     */
    public function storeForJob(string $path, string $ref, PrintJob $job): Asset
    {
        return $this->store($path, $ref, [
            'print_job_id' => $job->publicId(),
            'expires_at' => $job->expires_at,
        ]);
    }

    public function diskName(): string
    {
        return Config::string('printopoly.storage.disk');
    }

    public function delete(Asset $asset): void
    {
        $disk = Storage::disk($asset->disk);
        $disk->delete([$asset->preview_path, $asset->print_path]);

        $asset->delete();
    }

    /**
     * @param array{user_id?: string, edition_id?: string, print_job_id?: string, expires_at?: CarbonImmutable|null} $owner
     *
     * @throws PhotoRejectedException
     */
    private function store(string $path, string $ref, array $owner): Asset
    {
        $processed = $this->processor->process($path);

        $disk = $this->diskName();
        $folder = 'assets/' . Str::ulid();
        $previewPath = $folder . '/preview.webp';
        $printPath = $folder . ($processed->transparent ? '/print.png' : '/print.jpg');

        $storage = Storage::disk($disk);
        $storage->put($previewPath, $processed->preview);
        $storage->put($printPath, $processed->printSource);

        $asset = new Asset([
            'ref' => $ref,
            'disk' => $disk,
            'preview_path' => $previewPath,
            'print_path' => $printPath,
            'width' => $processed->printWidth,
            'height' => $processed->printHeight,
            'original_width' => $processed->originalWidth,
            'original_height' => $processed->originalHeight,
            'bytes' => mb_strlen($processed->preview, encoding: '8bit') + mb_strlen($processed->printSource, encoding: '8bit'),
            'checksum' => hash('sha256', $processed->printSource),
            ...$owner,
        ]);
        $asset->save();

        return $asset;
    }
}
