<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_tracking_updates', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('note');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->float('location_accuracy')->nullable()->after('longitude');
            $table->string('photo_path')->nullable()->after('location_accuracy');
            $table->string('photo_original_name')->nullable()->after('photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('booking_tracking_updates', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'location_accuracy', 'photo_path', 'photo_original_name']);
        });
    }
};
