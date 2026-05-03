<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_profiles', function (Blueprint $table) {
            $table->index(['status', 'service_category', 'created_at'], 'idx_service_status_category_created');
            $table->index(['status', 'pricing_starting_from'], 'idx_service_status_price');
        });

        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->index(['user_id', 'service_area_state'], 'idx_vendor_user_state');
        });
    }

    public function down(): void
    {
        Schema::table('service_profiles', function (Blueprint $table) {
            $table->dropIndex('idx_service_status_category_created');
            $table->dropIndex('idx_service_status_price');
        });

        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->dropIndex('idx_vendor_user_state');
        });
    }
};