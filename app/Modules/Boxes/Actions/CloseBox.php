<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Actions;

use App\Models\CollectionBox;

/**
 * The owner closes the box (B128): the link stays, but friends can no longer add anything. What is already inside can
 * still be accepted or rejected.
 */
final readonly class CloseBox
{
    public function handle(CollectionBox $box): CollectionBox
    {
        $box->status = CollectionBox::CLOSED;
        $box->save();

        return $box;
    }
}
