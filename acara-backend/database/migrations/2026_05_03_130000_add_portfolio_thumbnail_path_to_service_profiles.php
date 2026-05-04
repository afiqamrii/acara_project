<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('service_profiles') || Schema::hasColumn('service_profiles', 'portfolio_thumbnail_path')) {
            return;
        }

        Schema::table('service_profiles', function (Blueprint $table) {
            $table->string('portfolio_thumbnail_path')->nullable()->after('portfolio_path');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('service_profiles') || !Schema::hasColumn('service_profiles', 'portfolio_thumbnail_path')) {
            return;
        }

        Schema::table('service_profiles', function (Blueprint $table) {
            $table->dropColumn('portfolio_thumbnail_path');
        });
    }
};
