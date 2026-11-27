<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Actions;

use App\Models\CollectionBox;
use App\Modules\Boxes\Support\BoxSnapshot;

/**
 * The owner changed names since the box was made: friends should see the current ones (B128). Only the snapshot, the
 * edition name and whether friends see the card texts (B176) change here; a null leaves the value as it is.
 */
final readonly class UpdateBox
{
    public function __construct(private BoxSnapshot $snapshots)
    {
    }

    /**
     * @param array<mixed>|null $snapshot
     */
    public function handle(CollectionBox $box, ?bool $cardsHidden, ?array $snapshot, ?string $editionName): CollectionBox
    {
        if ($cardsHidden !== null) {
            $box->cards_hidden = $cardsHidden;
        }

        if ($snapshot !== null) {
            $box->snapshot = $this->snapshots->clean($snapshot);
        }

        if ($editionName !== null) {
            $box->edition_name = mb_substr($editionName, 0, 120);
        }

        $box->save();

        return $box;
    }
}
