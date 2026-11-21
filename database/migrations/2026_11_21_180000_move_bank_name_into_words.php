<?php

declare(strict_types=1);

use App\Edition\EditionPayload;
use App\Models\Edition;
use Illuminate\Database\Migrations\Migration;

/**
 * The bank name moved from its own element `bank` into the words of the edition, `words.bank` (B148). Stored
 * editions are rewritten once. The revision stays, because the edition means the same; reading and patching also
 * move the key, so a document that changes in between is picked up there.
 */
return new class() extends Migration
{
    public function up(): void
    {
        Edition::query()
            ->where('elements.bank', 'exists', true)
            ->each(function (Edition $edition): void {
                Edition::query()
                    ->where('_id', $edition->getKey())
                    ->where('revision', $edition->revision)
                    ->update(['elements' => EditionPayload::asObject(EditionPayload::migrated($edition->elements))]);
            });
    }

    public function down(): void
    {
        // The old key is not written back: every reader moves it anyway.
    }
};
