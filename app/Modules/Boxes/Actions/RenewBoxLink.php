<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Actions;

use App\Models\CollectionBox;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;

/**
 * A new link for the same box (B128): the old link stops working at once (it no longer finds a box), the contributions
 * already sent stay, and the box opens again. The box remembers a hash of the old link, so a friend who opens it reads
 * that it was replaced (B175).
 */
final readonly class RenewBoxLink
{
    public function handle(CollectionBox $box): CollectionBox
    {
        $box->replaced_tokens = array_slice([CollectionBox::tokenHash($box->token), ...($box->replaced_tokens ?? [])], 0, CollectionBox::REMEMBERED_TOKENS);
        $box->token = Str::random(40);
        $box->status = CollectionBox::OPEN;
        $box->last_activity_at = now();
        $box->expires_at = now()->addDays(Config::integer('printopoly.boxes.retention_days'));
        $box->save();

        return $box;
    }
}
