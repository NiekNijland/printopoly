<?php

declare(strict_types=1);

namespace App\Boxes;

use App\Models\CollectionBox;
use App\Photos\PhotoProcessor;
use App\Photos\PhotoRejected;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Checks a friend's photo like every other upload (B69, B70: type from the content, pixels counted before decoding,
 * decoded and encoded again without EXIF) and keeps the two derived images privately on the configured disk, in a
 * folder of the box. The original is never kept. The size limit for friends is lower than the one for the owner.
 */
final readonly class BoxPhotos
{
    public function __construct(private PhotoProcessor $processor)
    {
    }

    /**
     * @return array{disk: string, preview_path: string, print_path: string, width: int, height: int, bytes: int}
     *
     * @throws PhotoRejected
     */
    public function store(UploadedFile $file, CollectionBox $box): array
    {
        $limit = config()->integer('printopoly.boxes.photo_max_megabytes');

        if (! $file->isValid() || $file->getSize() > $limit * 1024 * 1024) {
            throw PhotoRejected::tooLarge($limit);
        }

        $processed = $this->processor->process((string) $file->getRealPath());

        $disk = config()->string('printopoly.storage.disk');
        $folder = 'box-photos/' . $box->publicId() . '/' . Str::ulid();
        $storage = Storage::disk($disk);
        $storage->put($folder . '/preview.webp', $processed->preview);
        $storage->put($folder . '/print.jpg', $processed->printSource);

        return [
            'disk' => $disk,
            'preview_path' => $folder . '/preview.webp',
            'print_path' => $folder . '/print.jpg',
            'width' => $processed->printWidth,
            'height' => $processed->printHeight,
            'bytes' => strlen($processed->preview) + strlen($processed->printSource),
        ];
    }
}
