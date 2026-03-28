<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('vendor_profiles')) {
            Schema::create('vendor_profiles', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('ssm_number')->nullable();
                $table->string('ssm_document_path');
                $table->string('business_name');
                $table->text('business_link');
                $table->unsignedInteger('years_of_experience');
                $table->string('service_area_state');
                $table->string('service_area_town');
                $table->string('bank_name');
                $table->string('bank_account_number');
                $table->string('bank_holder_name');
                $table->string('status')->default('pending_completion');
                $table->timestamps();
            });
        } elseif (!Schema::hasColumn('vendor_profiles', 'ssm_document_path')) {
            Schema::table('vendor_profiles', function (Blueprint $table) {
                $table->string('ssm_document_path')->nullable()->after('ssm_number');
            });
        }

        $foreignKeyExists = DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'vendor_profiles')
            ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
            ->where('CONSTRAINT_NAME', 'vendor_profiles_vendor_user_id_foreign')
            ->exists();

        if (!$foreignKeyExists) {
            Schema::table('vendor_profiles', function (Blueprint $table) {
                $table->foreign('user_id', 'vendor_profiles_vendor_user_id_foreign')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('vendor_profiles')) {
            $foreignKeyExists = DB::table('information_schema.TABLE_CONSTRAINTS')
                ->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())
                ->where('TABLE_NAME', 'vendor_profiles')
                ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
                ->where('CONSTRAINT_NAME', 'vendor_profiles_vendor_user_id_foreign')
                ->exists();

            if ($foreignKeyExists) {
                Schema::table('vendor_profiles', function (Blueprint $table) {
                    $table->dropForeign('vendor_profiles_vendor_user_id_foreign');
                });
            }

            if (Schema::hasColumn('vendor_profiles', 'ssm_document_path')) {
                Schema::table('vendor_profiles', function (Blueprint $table) {
                    $table->dropColumn('ssm_document_path');
                });
            }
        }

        Schema::dropIfExists('vendor_profiles');
    }
};
