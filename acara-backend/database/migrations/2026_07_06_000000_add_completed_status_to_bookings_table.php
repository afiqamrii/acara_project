<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('cart', 'pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'cart'");
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("UPDATE bookings SET status = 'confirmed' WHERE status = 'completed'");
        DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('cart', 'pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'cart'");
    }
};
