<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_profile_id')->constrained()->cascadeOnDelete();
            $table->date('selected_date');
            $table->enum('status', ['cart', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled'])->default('cart');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'service_profile_id', 'selected_date']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
