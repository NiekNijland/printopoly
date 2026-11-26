<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint;

/**
 * Indexes for the lookups that had none. The account indexes are not unique until production is checked for duplicates.
 */
return new class() extends Migration
{
    public function up(): void
    {
        Schema::connection('mongodb')->table('users', function (Blueprint $collection): void {
            $collection->index('google_id');
            $collection->index('email');
            $collection->index('last_active_at');
            $collection->index('inactivity_warning_sent_at');
        });

        Schema::connection('mongodb')->table('collection_boxes', function (Blueprint $collection): void {
            $collection->index('replaced_tokens');
        });

        Schema::connection('mongodb')->table('print_files', function (Blueprint $collection): void {
            $collection->index(['print_job_id' => 1, 'kind' => 1, 'part' => 1, 'set' => 1, 'cache_key' => 1]);
        });

        Schema::connection('mongodb')->table('print_jobs', function (Blueprint $collection): void {
            $collection->index('active_at');
        });
    }

    public function down(): void
    {
        Schema::connection('mongodb')->table('users', function (Blueprint $collection): void {
            $collection->dropIndex('google_id_1');
            $collection->dropIndex('email_1');
            $collection->dropIndex('last_active_at_1');
            $collection->dropIndex('inactivity_warning_sent_at_1');
        });

        Schema::connection('mongodb')->table('collection_boxes', function (Blueprint $collection): void {
            $collection->dropIndex('replaced_tokens_1');
        });

        Schema::connection('mongodb')->table('print_files', function (Blueprint $collection): void {
            $collection->dropIndex('print_job_id_1_kind_1_part_1_set_1_cache_key_1');
        });

        Schema::connection('mongodb')->table('print_jobs', function (Blueprint $collection): void {
            $collection->dropIndex('active_at_1');
        });
    }
};
