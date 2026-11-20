<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint;

/**
 * Indexes for the print pipeline collections (B60). MongoDB creates the
 * collections itself on first write; this only adds what lookups and the
 * nightly cleanup rely on.
 */
return new class() extends Migration
{
    public function up(): void
    {
        Schema::connection('mongodb')->table('editions', function (Blueprint $collection): void {
            $collection->index('user_id');
        });

        Schema::connection('mongodb')->table('assets', function (Blueprint $collection): void {
            $collection->index(['user_id' => 1, 'ref' => 1]);
            $collection->index(['print_job_id' => 1, 'ref' => 1]);
            $collection->index('expires_at');
        });

        Schema::connection('mongodb')->table('print_jobs', function (Blueprint $collection): void {
            $collection->unique('token');
            $collection->index(['user_id' => 1, 'edition_id' => 1]);
            $collection->index('ip_hash');
            $collection->index('expires_at');
        });

        Schema::connection('mongodb')->table('print_files', function (Blueprint $collection): void {
            $collection->index(['print_job_id' => 1, 'kind' => 1, 'part' => 1]);
            $collection->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::connection('mongodb')->dropIfExists('print_files');
        Schema::connection('mongodb')->dropIfExists('print_jobs');
        Schema::connection('mongodb')->dropIfExists('assets');
        Schema::connection('mongodb')->dropIfExists('editions');
    }
};
