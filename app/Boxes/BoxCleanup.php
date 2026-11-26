<?php

declare(strict_types=1);

namespace App\Boxes;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use Illuminate\Support\Facades\Storage;

/**
 * Removes boxes and what is in them (B128): a box goes `retention_days` after its last activity, with the owner's
 * edition (EditionDeletedEvent), with the account (AccountDeleting) and when the owner deletes it. The photos are
 * private files on the configured disk, so they are deleted there too.
 */
final class BoxCleanup
{
    /**
     * Boxes whose time is up, with their contributions and photos.
     *
     * @return array{boxes: int, contributions: int}
     */
    public function run(): array
    {
        $counts = ['boxes' => 0, 'contributions' => 0];

        foreach (CollectionBox::query()->where('expires_at', '<', now()->toDateTime())->get() as $box) {
            $counts['contributions'] += $this->deleteBox($box);
            $counts['boxes']++;
        }

        // Contributions whose box is already gone (a crash half-way a deletion).
        $known = CollectionBox::query()->pluck('id')->map(static fn (mixed $id): string => is_string($id) ? $id : '')->all();

        foreach (BoxContribution::query()->whereNotIn('box_id', $known)->get() as $orphan) {
            $this->deleteContribution($orphan);
            $counts['contributions']++;
        }

        return $counts;
    }

    /**
     * @return int The number of contributions that went with it.
     */
    public function deleteBox(CollectionBox $box): int
    {
        $deleted = 0;

        foreach (BoxContribution::query()->where('box_id', $box->publicId())->get() as $contribution) {
            $this->deleteContribution($contribution);
            $deleted++;
        }

        $box->delete();

        return $deleted;
    }

    public function deleteContribution(BoxContribution $contribution): void
    {
        if ($contribution->disk !== null) {
            Storage::disk($contribution->disk)->delete(array_values(array_filter([$contribution->preview_path, $contribution->print_path], static fn (?string $path): bool => $path !== null)));
        }

        $contribution->delete();
    }

    /**
     * The edition of an account is deleted (EditionDeletedEvent).
     */
    public function deleteForEdition(string $userId, string $editionId): void
    {
        foreach (CollectionBox::query()->where('user_id', $userId)->where('edition_id', $editionId)->get() as $box) {
            $this->deleteBox($box);
        }
    }

    /**
     * The account is deleted (AccountDeleting, B68).
     */
    public function deleteForUser(string $userId): void
    {
        foreach (CollectionBox::query()->where('user_id', $userId)->get() as $box) {
            $this->deleteBox($box);
        }
    }
}
