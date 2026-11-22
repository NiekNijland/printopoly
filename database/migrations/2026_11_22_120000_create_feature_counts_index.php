<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint;

/**
 * The anonymous feature counter (B206): one document per event per day.
 */
return new class() extends Migration
{
    public function up(): void
    {
        Schema::connection('mongodb')->table('feature_counts', function (Blueprint $collection): void {
            $collection->unique(['event' => 1, 'day' => 1]);
        });
    }

    public function down(): void
    {
        Schema::connection('mongodb')->dropIfExists('feature_counts');
    }
};
