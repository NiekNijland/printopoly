<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Support;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * Removes boxes and what is in them (B128): a box goes `retention_days` after its last activity, with the owner's
 * edition (EditionDeletedEvent), with the account (AccountDeletingEvent) and when the owner deletes it. The photos are
 * private files on the configured disk, so they are deleted there too.
 */
final class BoxCleanup
{
    private const int PAGE = 100;

    /**
     * Boxes whose time is up, with their contributions and photos.
     *
     * @return array{boxes: int, contributions: int}
     */
    public function run(): array
    {
        $counts = ['boxes' => 0, 'contributions' => 0];

        CollectionBox::query()->where('expires_at', '<', now()->toDateTime())->chunkById(self::PAGE, function (Collection $boxes) use (&$counts): void {
            $counts['contributions'] += $this->deleteBoxes($boxes->all());
            $counts['boxes'] += $boxes->count();
        });

        // Contributions whose box is already gone (a crash half-way a deletion).
        BoxContribution::query()->chunkById(self::PAGE, function (Collection $contributions) use (&$counts): void {
            $counts['contributions'] += $this->deleteOrphans($contributions->all());
        });

        return $counts;
    }

    /**
     * @return int The number of contributions that went with it.
     */
    public function deleteBox(CollectionBox $box): int
    {
        return $this->deleteBoxes([$box]);
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
        CollectionBox::query()->where('user_id', $userId)->where('edition_id', $editionId)->chunkById(self::PAGE, function (Collection $boxes): void {
            $this->deleteBoxes($boxes->all());
        });
    }

    /**
     * The account is deleted (AccountDeletingEvent, B68).
     */
    public function deleteForUser(string $userId): void
    {
        CollectionBox::query()->where('user_id', $userId)->chunkById(self::PAGE, function (Collection $boxes): void {
            $this->deleteBoxes($boxes->all());
        });
    }

    /**
     * @param array<array-key, CollectionBox> $boxes
     * @return int The number of contributions that went with them.
     */
    private function deleteBoxes(array $boxes): int
    {
        $deleted = 0;
        $ids = array_values(array_map(static fn (CollectionBox $box): string => $box->publicId(), $boxes));

        BoxContribution::query()->whereIn('box_id', $ids)->chunkById(self::PAGE, function (Collection $contributions) use (&$deleted): void {
            foreach ($contributions as $contribution) {
                $this->deleteContribution($contribution);
                $deleted++;
            }
        });

        foreach ($boxes as $box) {
            $box->delete();
        }

        return $deleted;
    }

    /**
     * @param array<array-key, BoxContribution> $contributions
     * @return int The number of contributions deleted.
     */
    private function deleteOrphans(array $contributions): int
    {
        $boxIds = array_values(array_unique(array_map(static fn (BoxContribution $contribution): string => $contribution->box_id, $contributions)));
        $known = [];

        foreach (CollectionBox::query()->whereIn('_id', $boxIds)->lazyById(self::PAGE) as $box) {
            $known[$box->publicId()] = true;
        }

        $deleted = 0;

        foreach ($contributions as $contribution) {
            if (! isset($known[$contribution->box_id])) {
                $this->deleteContribution($contribution);
                $deleted++;
            }
        }

        return $deleted;
    }
}
