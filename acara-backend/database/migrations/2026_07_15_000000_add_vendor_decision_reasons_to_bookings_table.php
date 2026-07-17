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
            DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('cart', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled') NOT NULL DEFAULT 'cart'");
        }

        Schema::table('bookings', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('notes');
            $table->text('cancellation_reason')->nullable()->after('rejection_reason');
            $table->string('cancelled_by', 20)->nullable()->after('cancellation_reason');
            $table->timestamp('rejected_at')->nullable()->after('cancelled_by');
            $table->timestamp('cancelled_at')->nullable()->after('rejected_at');
        });
    }

    public function down(): void
    {
        DB::table('bookings')->where('status', 'rejected')->update(['status' => 'cancelled']);

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('cart', 'pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'cart'");
        }

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'rejection_reason',
                'cancellation_reason',
                'cancelled_by',
                'rejected_at',
                'cancelled_at',
            ]);
        });
    }
};
