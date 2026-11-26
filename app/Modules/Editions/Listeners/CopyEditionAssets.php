<?php

declare(strict_types=1);

namespace App\Modules\Editions\Listeners;

use App\Models\Asset;
use App\Modules\Editions\Events\EditionDuplicatedEvent;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * A copy of an edition gets its own copies of the photos, under the same photo ids. The copy's
 * elements keep pointing at the same ids, and deleting the original no longer takes its photos away.
 * Photos are found by user, edition and id, so the two never share a file.
 */
final class CopyEditionAssets
{
    public function handle(EditionDuplicatedEvent $event): void
    {
        foreach (Asset::query()->where('user_id', $event->userId)->where('edition_id', $event->sourceId)->get() as $source) {
            $disk = Storage::disk($source->disk);
            $folder = 'assets/' . Str::ulid();
            $previewPath = $folder . '/preview.webp';
            $printPath = $folder . (str_ends_with($source->print_path, '.png') ? '/print.png' : '/print.jpg');

            $disk->copy($source->preview_path, $previewPath);
            $disk->copy($source->print_path, $printPath);

            $copy = new Asset([
                'ref' => $source->ref,
                'user_id' => $event->userId,
                'edition_id' => $event->copyId,
                'disk' => $source->disk,
                'preview_path' => $previewPath,
                'print_path' => $printPath,
                'width' => $source->width,
                'height' => $source->height,
                'original_width' => $source->original_width,
                'original_height' => $source->original_height,
                'bytes' => $source->bytes,
                'checksum' => $source->checksum,
            ]);
            $copy->save();
        }
    }
}
