<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Models\Asset;
use App\Models\Edition;
use App\Models\PrintJob;
use App\Modules\Editions\Support\EditionPayload;
use App\Modules\Photos\ValueObjects\PhotoPlacement;
use App\Modules\Print\Enums\FailureReason;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;
use stdClass;

/**
 * Finds what a print job renders: the edition (live for a user, the uploaded
 * copy for an anonymous job) and the photos it points at. Photos are looked
 * up inside the job's owner only, so a placement can never pull in a photo
 * of somebody else (B69).
 */
final readonly class PrintJobContext
{
    public function __construct(private EditionPayload $payload)
    {
    }

    /**
     * The edition of the job. With a set, the photo frame sizes the browser measured for that set are
     * written into the placements (the frames differ per set: bleed, panels, stickers).
     *
     * @throws PrintFailedException
     */
    public function edition(PrintJob $job, ?PrintSet $set = null): PrintEditionData
    {
        $edition = $this->load($job);

        if (! $set instanceof PrintSet) {
            return $edition;
        }

        // The amount of play money is chosen per set (B156). Money taken out of the set is noted for the booklet. The
        // number of sets, the form of the board and the number of invitations come along (B242, B243, B244).
        $choice = $job->choiceFor($set);
        $edition = $edition->forSet(
            $set,
            $choice->moneyAmount,
            moneyLeftOut: in_array(PrintPart::Money, $choice->skipped, true),
            sets: $choice->copies,
            boardForm: $choice->boardForm,
            invitations: $choice->invitations,
        );
        $targets = $job->photo_targets;

        if (is_array($targets)) {
            return $edition->withTargets($targets[$set->value] ?? []);
        }

        return $edition;
    }

    /**
     * @throws PrintFailedException
     */
    private function load(PrintJob $job): PrintEditionData
    {
        try {
            if ($job->edition_id !== null) {
                $edition = Edition::query()
                    ->where('user_id', $job->user_id)
                    ->where('edition_id', $job->edition_id)
                    ->first() ?? throw new PrintFailedException('The edition of this print job no longer exists.', reason: FailureReason::Edition);

                $data = $this->payload->from($edition);

                return PrintEditionData::fromArray($data, $this->photoSizes($job, $data));
            }

            $data = $job->edition ?? [];

            return PrintEditionData::fromArray($data, $this->photoSizes($job, $data));
        } catch (InvalidArgumentException $invalidArgumentException) {
            throw new PrintFailedException($invalidArgumentException->getMessage(), $invalidArgumentException->getCode(), previous: $invalidArgumentException, reason: FailureReason::Edition);
        }
    }

    /**
     * The assets the given placements need, by ref.
     *
     * @return array<string, Asset>
     *
     * @throws PrintFailedException
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

        $found = [];
        foreach ($this->ownedAssets($job)->whereIn('ref', $refs)->get() as $asset) {
            $found[$asset->ref] = $asset;
        }

        $missing = array_diff($refs, array_keys($found));
        if ($missing !== []) {
            throw new PrintFailedException('A photo in the edition is missing: ' . implode(', ', $missing), reason: FailureReason::Photos);
        }

        return $found;
    }

    /**
     * The pixel size of each photo on a street, station or utility, by ref, so a title deed that borrows it gets the
     * crop of its own frame (B239). Only the job's own photos; one that is missing is left out, and the deed then
     * keeps the crop of its space.
     *
     * @param array<mixed> $data
     * @return array<string, array{width: int, height: int}>
     */
    private function photoSizes(PrintJob $job, array $data): array
    {
        $elements = $data['elements'] ?? [];

        if ($elements instanceof stdClass) {
            $elements = (array) $elements;
        }

        if (! is_array($elements)) {
            return [];
        }

        $refs = [];
        foreach ($elements as $key => $element) {
            $photo = is_array($element) ? $element['photo'] ?? null : null;

            if (str_starts_with((string) $key, 'space.') && is_array($photo) && is_string($photo['photoId'] ?? null)) {
                $refs[] = $photo['photoId'];
            }
        }

        if ($refs === []) {
            return [];
        }

        $sizes = [];
        foreach ($this->ownedAssets($job)->whereIn('ref', array_values(array_unique($refs)))->get() as $asset) {
            $sizes[$asset->ref] = ['width' => $asset->width, 'height' => $asset->height];
        }

        return $sizes;
    }

    /**
     * The assets a job may use: those of its edition in its owner's account, or those uploaded with an anonymous job
     * (B69).
     *
     * @return Builder<Asset>
     */
    private function ownedAssets(PrintJob $job): Builder
    {
        $query = Asset::query();

        if ($job->user_id !== null) {
            return $query->where('user_id', $job->user_id)->where('edition_id', $job->edition_id);
        }

        return $query->where('print_job_id', $job->publicId());
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
