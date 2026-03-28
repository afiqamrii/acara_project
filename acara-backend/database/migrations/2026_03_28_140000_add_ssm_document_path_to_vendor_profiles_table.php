<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('vendor_profiles') || Schema::hasColumn('vendor_profiles', 'ssm_document_path')) {
            return;
        }

        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->string('ssm_document_path')->nullable()->after('ssm_number');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('vendor_profiles') || !Schema::hasColumn('vendor_profiles', 'ssm_document_path')) {
            return;
        }

        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->dropColumn('ssm_document_path');
        });
    }
};
