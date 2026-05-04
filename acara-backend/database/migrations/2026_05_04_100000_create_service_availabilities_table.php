<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_profile_id')
                ->constrained('service_profiles')
                ->cascadeOnDelete();
            $table->date('available_date');
            $table->timestamps();

            $table->unique(['service_profile_id', 'available_date']);
            $table->index(['service_profile_id', 'available_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_availabilities');
    }
};
