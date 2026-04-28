<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_profiles', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'marketplace_sp_status_created_at_idx');
            $table->index('user_id', 'marketplace_sp_user_id_idx');
            $table->index('service_category', 'marketplace_sp_service_category_idx');
            $table->index('pricing_starting_from', 'marketplace_sp_pricing_start_idx');
        });

        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->index('user_id', 'marketplace_vp_user_id_idx');
            $table->index('service_area_state', 'marketplace_vp_area_state_idx');
        });
    }

    public function down(): void
    {
        Schema::table('service_profiles', function (Blueprint $table) {
            $table->dropIndex('marketplace_sp_status_created_at_idx');
            $table->dropIndex('marketplace_sp_user_id_idx');
            $table->dropIndex('marketplace_sp_service_category_idx');
            $table->dropIndex('marketplace_sp_pricing_start_idx');
        });

        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->dropIndex('marketplace_vp_user_id_idx');
            $table->dropIndex('marketplace_vp_area_state_idx');
        });
    }
};
