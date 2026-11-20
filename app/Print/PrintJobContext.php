<?php

declare(strict_types=1);

namespace App\Print;

use App\Edition\EditionPayload;
use App\Enums\PrintSet;
use App\Models\Asset;
use App\Models\Edition;
use App\Models\PrintJob;
use App\Photos\PhotoPlacement;
use InvalidArgumentException;

/**
 * Finds what a print job renders: the edition (live for a user, the uploaded
 * copy for an anonymous job) and the photos it points at. Photos are looked
 * up inside the job's owner only, so a placement can never pull in a photo
 * of somebody else (B69).
 */
final class PrintJobContext
{
    /**
     * The edition of the job. With a set, the photo frame sizes the browser measured for that set are
     * written into the placements (the frames differ per set: bleed, panels, stickers).
     *
     * @throws PrintFailed
     */
    public function edition(PrintJob $job, ?PrintSet $set = null): PrintEditionData
    {
        $edition = $this->load($job);
        $targets = $job->photo_targets;

        if ($set instanceof PrintSet && is_array($targets)) {
            $forSet = $targets[$set->value] ?? [];

            return $edition->withTargets(is_array($forSet) ? $forSet : []);
        }

        return $edition;
    }

    /**
     * @throws PrintFailed
     */
    private function load(PrintJob $job): PrintEditionData
    {
        try {
            if ($job->edition_id !== null) {
                $edition = Edition::query()
                    ->where('user_id', $job->user_id)
                    ->where('edition_id', $job->edition_id)
                    ->first();

                if (! $edition instanceof Edition) {
                    throw new PrintFailed('The edition of this print job no longer exists.');
                }

                return PrintEditionData::fromArray(EditionPayload::from($edition));
            }

            return PrintEditionData::fromArray($job->edition ?? []);
        } catch (InvalidArgumentException $exception) {
            throw new PrintFailed($exception->getMessage(), $exception->getCode(), previous: $exception);
        }
    }

    /**
     * The assets the given placements need, by ref.
     *
     * @return array<string, Asset>
     *
     * @throws PrintFailed
     */
    public function assets(PrintJob $job, PrintEditionData $edition): array
    {
        $refs = array_values(array_unique(array_map(
            static fn (PhotoPlacement $placement): string => $placement->assetRef,
            $edition->placements(),
        )));

        if ($refs === []) {
            return [];
        }

        $query = Asset::query()->whereIn('ref', $refs);

        if ($job->user_id !== null) {
            $query->where('user_id', $job->user_id)->where('edition_id', $job->edition_id);
        } else {
            $query->where('print_job_id', $job->publicId());
        }

        $found = [];
        foreach ($query->get() as $asset) {
            $found[$asset->ref] = $asset;
        }

        $missing = array_diff($refs, array_keys($found));
        if ($missing !== []) {
            throw new PrintFailed('A photo in the edition is missing: ' . implode(', ', $missing));
        }

        return $found;
    }

    /**
     * Photo ref to the checksum of its print source, for the cache key. Only
     * the photos the given edition (or part of it) places.
     *
     * @param array<string, Asset> $assets
     * @return array<string, string>
     */
    public function checksumsFor(PrintEditionData $edition, array $assets): array
    {
        $checksums = [];
        foreach ($edition->placements() as $placement) {
            if (isset($assets[$placement->assetRef])) {
                $checksums[$placement->assetRef] = $assets[$placement->assetRef]->checksum;
            }
        }

        return $checksums;
    }
}
