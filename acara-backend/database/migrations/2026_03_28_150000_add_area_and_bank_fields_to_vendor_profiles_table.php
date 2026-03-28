<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('vendor_profiles')) {
            return;
        }

        Schema::table('vendor_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('vendor_profiles', 'service_area_state')) {
                $table->string('service_area_state')->nullable()->after('years_of_experience');
            }
            if (!Schema::hasColumn('vendor_profiles', 'service_area_town')) {
                $table->string('service_area_town')->nullable()->after('service_area_state');
            }
            if (!Schema::hasColumn('vendor_profiles', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('service_area_town');
            }
            if (!Schema::hasColumn('vendor_profiles', 'bank_account_number')) {
                $table->string('bank_account_number')->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('vendor_profiles', 'bank_holder_name')) {
                $table->string('bank_holder_name')->nullable()->after('bank_account_number');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('vendor_profiles')) {
            return;
        }

        Schema::table('vendor_profiles', function (Blueprint $table) {
            $columnsToDrop = [];

            foreach ([
                'service_area_state',
                'service_area_town',
                'bank_name',
                'bank_account_number',
                'bank_holder_name',
            ] as $column) {
                if (Schema::hasColumn('vendor_profiles', $column)) {
                    $columnsToDrop[] = $column;
                }
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
