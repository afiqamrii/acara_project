<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_briefs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('event_title', 150);
            $table->string('event_type', 100);
            $table->string('venue_name', 150);
            $table->text('venue_address');
            $table->time('start_time');
            $table->time('end_time')->nullable();
            $table->unsignedInteger('guest_count')->nullable();
            $table->string('contact_name', 150);
            $table->string('contact_phone', 30);
            $table->time('setup_time')->nullable();
            $table->text('requirements')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_briefs');
    }
};
