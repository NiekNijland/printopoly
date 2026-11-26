<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use MongoDB\Laravel\Connection;

/**
 * The bank name moved from its own element `bank` into the words of the edition, `words.bank` (B148). Stored
 * editions are rewritten once. The revision stays, because the edition means the same; reading and patching also
 * move the key, so a document that changes in between is picked up there.
 */
return new class() extends Migration
{
    public function up(): void
    {
        $connection = DB::connection('mongodb');
        throw_unless($connection instanceof Connection, LogicException::class, 'The mongodb connection must use the MongoDB Laravel driver.');
        $editions = $connection->getDatabase()->selectCollection('editions');
        $documents = $editions->find(
            ['elements.bank' => ['$exists' => true]],
            ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']],
        );

        foreach ($documents as $edition) {
            if (! is_array($edition) || ! is_array($edition['elements'] ?? null)) {
                continue;
            }

            $elements = $edition['elements'];
            unset($elements['fold_models'], $elements['dice']);
            $elements['words.bank'] ??= $elements['bank'];
            unset($elements['bank']);

            $editions->updateOne(
                ['_id' => $edition['_id'], 'revision' => $edition['revision'] ?? null],
                ['$set' => ['elements' => $elements]],
            );
        }
    }

    public function down(): void
    {
        // The old key is not written back: every reader moves it anyway.
    }
};
