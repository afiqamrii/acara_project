<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('email_enabled')->default(true);
            $table->boolean('email_booking_updates')->default(true);
            $table->boolean('email_quotation_updates')->default(true);
            $table->boolean('email_booking_messages')->default(true);
            $table->boolean('email_completion_updates')->default(true);
            $table->boolean('email_review_updates')->default(true);
            $table->boolean('email_service_updates')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notification_preferences');
    }
};
