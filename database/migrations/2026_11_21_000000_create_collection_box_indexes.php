<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint;

/**
 * Indexes for "Samen maken" (B128): a box is found by its secret token, by owner and edition, and by its expiry
 * for the cleanup.
 */
return new class() extends Migration
{
    public function up(): void
    {
        Schema::connection('mongodb')->table('collection_boxes', function (Blueprint $collection): void {
            $collection->unique('token');
            $collection->index(['user_id' => 1, 'edition_id' => 1]);
            $collection->index('ip_hash');
            $collection->index('expires_at');
        });

        Schema::connection('mongodb')->table('box_contributions', function (Blueprint $collection): void {
            $collection->index(['box_id' => 1, 'receipt' => 1]);
        });
    }

    public function down(): void
    {
        Schema::connection('mongodb')->dropIfExists('box_contributions');
        Schema::connection('mongodb')->dropIfExists('collection_boxes');
    }
};
