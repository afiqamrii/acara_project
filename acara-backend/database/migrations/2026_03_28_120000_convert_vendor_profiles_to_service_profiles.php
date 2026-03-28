<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vendor_profiles') && !Schema::hasTable('service_profiles')) {
            Schema::rename('vendor_profiles', 'service_profiles');
        }

        if (!Schema::hasTable('service_profiles')) {
            return;
        }

        if (Schema::hasColumn('service_profiles', 'business_name')) {
            Schema::table('service_profiles', function (Blueprint $table) {
                $table->renameColumn('business_name', 'service_name');
            });
        }

        if (Schema::hasColumn('service_profiles', 'vendor_category')) {
            Schema::table('service_profiles', function (Blueprint $table) {
                $table->renameColumn('vendor_category', 'service_category');
            });
        }

        if (Schema::hasColumn('service_profiles', 'services_offered')) {
            Schema::table('service_profiles', function (Blueprint $table) {
                $table->renameColumn('services_offered', 'service_details');
            });
        }

        Schema::table('service_profiles', function (Blueprint $table) {
            $columnsToDrop = [];

            foreach ([
                'service_area',
                'bank_name',
                'bank_account_number',
                'bank_holder_name',
                'verification_documents_path',
            ] as $column) {
                if (Schema::hasColumn('service_profiles', $column)) {
                    $columnsToDrop[] = $column;
                }
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('service_profiles')) {
            return;
        }

        Schema::table('service_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('service_profiles', 'service_area')) {
                $table->string('service_area')->nullable()->after('pricing_description');
            }
            if (!Schema::hasColumn('service_profiles', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('portfolio_path');
            }
            if (!Schema::hasColumn('service_profiles', 'bank_account_number')) {
                $table->string('bank_account_number')->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('service_profiles', 'bank_holder_name')) {
                $table->string('bank_holder_name')->nullable()->after('bank_account_number');
            }
            if (!Schema::hasColumn('service_profiles', 'verification_documents_path')) {
                $table->string('verification_documents_path')->nullable()->after('bank_holder_name');
            }
        });

        if (Schema::hasColumn('service_profiles', 'service_name')) {
            Schema::table('service_profiles', function (Blueprint $table) {
                $table->renameColumn('service_name', 'business_name');
            });
        }

        if (Schema::hasColumn('service_profiles', 'service_category')) {
            Schema::table('service_profiles', function (Blueprint $table) {
                $table->renameColumn('service_category', 'vendor_category');
            });
        }

        if (Schema::hasColumn('service_profiles', 'service_details')) {
            Schema::table('service_profiles', function (Blueprint $table) {
                $table->renameColumn('service_details', 'services_offered');
            });
        }

        if (Schema::hasTable('service_profiles') && !Schema::hasTable('vendor_profiles')) {
            Schema::rename('service_profiles', 'vendor_profiles');
        }
    }
};
