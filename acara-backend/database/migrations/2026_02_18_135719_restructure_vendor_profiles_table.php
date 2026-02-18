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
        Schema::table('vendor_profiles', function (Blueprint $table) {
            // Drop old columns if they exist (using checks to avoid errors)
            if (Schema::hasColumn('vendor_profiles', 'pricing_info')) {
                $table->dropColumn('pricing_info');
            }
            if (Schema::hasColumn('vendor_profiles', 'bank_account_details')) {
                $table->dropColumn('bank_account_details');
            }

            // Add new columns for Pricing
            $table->decimal('pricing_starting_from', 10, 2)->after('services_offered')->nullable();
            $table->string('pricing_unit')->after('pricing_starting_from')->nullable(); 
            $table->text('pricing_description')->after('pricing_unit')->nullable();

            // Add new columns for Bank Details
            $table->string('bank_name')->after('service_area')->nullable();
            $table->string('bank_account_number')->after('bank_name')->nullable();
            $table->string('bank_holder_name')->after('bank_account_number')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->text('pricing_info')->nullable();
            $table->text('bank_account_details')->nullable();

            $table->dropColumn([
                'pricing_starting_from',
                'pricing_unit',
                'pricing_description',
                'bank_name',
                'bank_account_number',
                'bank_holder_name',
            ]);
        });
    }
};
