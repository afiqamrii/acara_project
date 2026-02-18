<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vendor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('business_name');
            $table->string('vendor_category');
            $table->text('services_offered'); // Can be JSON or text
            $table->text('pricing_info');     // Can be JSON or text
            $table->string('service_area');
            $table->string('portfolio_path')->nullable(); // File path
            $table->text('bank_account_details'); // Can be JSON or text
            $table->string('verification_documents_path')->nullable(); // File path
            $table->string('status')->default('pending_verification');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_profiles');
    }
};
