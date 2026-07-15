<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_profiles', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('status');
            $table->text('rejection_reason')->nullable()->after('is_active');
            $table->timestamp('rejected_at')->nullable()->after('rejection_reason');
            $table->timestamp('resubmitted_at')->nullable()->after('rejected_at');

            $table->index(['status', 'is_active', 'created_at'], 'service_management_visibility_idx');
        });
    }

    public function down(): void
    {
        Schema::table('service_profiles', function (Blueprint $table) {
            $table->dropIndex('service_management_visibility_idx');
            $table->dropColumn([
                'is_active',
                'rejection_reason',
                'rejected_at',
                'resubmitted_at',
            ]);
        });
    }
};
