<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration
{
    #[\Override]
    protected $connection = 'mongodb';

    /**
     * An edition id is unique per account, so two requests that create the
     * same edition at the same moment cannot both succeed.
     */
    public function up(): void
    {
        Schema::connection('mongodb')->table('editions', function (Blueprint $collection): void {
            $collection->unique(['user_id', 'edition_id']);
        });
    }

    public function down(): void
    {
        Schema::connection('mongodb')->table('editions', function (Blueprint $collection): void {
            $collection->dropIndex(['user_id', 'edition_id']);
        });
    }
};
