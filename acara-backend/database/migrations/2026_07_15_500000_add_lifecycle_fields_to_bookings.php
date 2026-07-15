<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('cart', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired') NOT NULL DEFAULT 'cart'");
        }

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'service_profile_id', 'selected_date']);
            $table->index(
                ['user_id', 'service_profile_id', 'selected_date'],
                'booking_customer_service_date_idx'
            );
            $table->timestamp('expires_at')->nullable()->after('cancelled_at');
            $table->timestamp('reminder_sent_at')->nullable()->after('expires_at');
            $table->timestamp('expired_at')->nullable()->after('reminder_sent_at');
            $table->index(['status', 'expires_at'], 'booking_lifecycle_expiry_idx');
        });

        DB::table('bookings')
            ->where('status', 'pending')
            ->whereNull('expires_at')
            ->update([
                'expires_at' => now()->addHours(max(1, (int) config('acara.booking_lifecycle.response_hours', 48))),
            ]);
    }

    public function down(): void
    {
        DB::table('bookings')->where('status', 'expired')->update(['status' => 'cancelled']);

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('booking_lifecycle_expiry_idx');
            $table->dropIndex('booking_customer_service_date_idx');
            $table->unique(['user_id', 'service_profile_id', 'selected_date']);
            $table->dropColumn([
                'expires_at',
                'reminder_sent_at',
                'expired_at',
            ]);
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('cart', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled') NOT NULL DEFAULT 'cart'");
        }
    }
};
