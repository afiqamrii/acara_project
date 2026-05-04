<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->date('business_started_at')->nullable()->after('business_link');
            $table->integer('years_of_experience')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('vendor_profiles', function (Blueprint $table) {
            $table->dropColumn('business_started_at');
            $table->integer('years_of_experience')->nullable(false)->change();
        });
    }
};
