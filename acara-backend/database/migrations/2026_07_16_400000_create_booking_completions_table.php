<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('completion_status', 40)->nullable()->after('status');
            $table->index('completion_status');
        });

        Schema::create('booking_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->string('status', 40)->default('pending');
            $table->text('completion_note');
            $table->string('proof_path')->nullable();
            $table->string('proof_original_name')->nullable();
            $table->timestamp('response_due_at');
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('disputed_at')->nullable();
            $table->text('dispute_reason')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('resolution', 30)->nullable();
            $table->text('resolution_note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'status']);
            $table->index(['status', 'response_due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_completions');

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex(['completion_status']);
            $table->dropColumn('completion_status');
        });
    }
};
