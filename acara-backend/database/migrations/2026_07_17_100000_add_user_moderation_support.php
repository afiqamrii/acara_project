<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('last_login_at')->nullable()->after('status');
            $table->timestamp('suspended_at')->nullable()->after('last_login_at');
            $table->text('suspension_reason')->nullable()->after('suspended_at');
            $table->foreignId('suspended_by')->nullable()->after('suspension_reason')->constrained('users')->nullOnDelete();

            $table->index(['status', 'role']);
            $table->index('email_verified_at');
        });

        Schema::create('user_moderation_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 40);
            $table->string('previous_status', 40);
            $table->string('new_status', 40);
            $table->text('reason');
            $table->timestamps();

            $table->index(['target_user_id', 'created_at']);
            $table->index(['admin_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_moderation_actions');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['suspended_by']);
            $table->dropIndex(['status', 'role']);
            $table->dropIndex(['email_verified_at']);
            $table->dropColumn([
                'last_login_at',
                'suspended_at',
                'suspension_reason',
                'suspended_by',
            ]);
        });
    }
};
