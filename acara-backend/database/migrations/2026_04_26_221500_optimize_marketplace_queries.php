<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('service_profiles')) {
            $this->addIndex('service_profiles', ['status', 'service_category', 'created_at'], 'marketplace_sp_status_category_created_idx');
            $this->addIndex('service_profiles', ['status', 'pricing_starting_from', 'created_at'], 'marketplace_sp_status_price_created_idx');
            $this->addFullText('service_profiles', ['service_name', 'service_category', 'service_details'], 'marketplace_sp_fulltext_idx');
        }

        if (Schema::hasTable('vendor_profiles')) {
            $this->addIndex('vendor_profiles', ['service_area_state', 'user_id'], 'marketplace_vp_state_user_idx');
            $this->addIndex('vendor_profiles', ['service_area_town', 'user_id'], 'marketplace_vp_town_user_idx');
            $this->addFullText('vendor_profiles', ['business_name'], 'marketplace_vp_business_fulltext_idx');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('vendor_profiles')) {
            $this->dropFullText('vendor_profiles', 'marketplace_vp_business_fulltext_idx');
            $this->dropIndex('vendor_profiles', 'marketplace_vp_town_user_idx');
            $this->dropIndex('vendor_profiles', 'marketplace_vp_state_user_idx');
        }

        if (Schema::hasTable('service_profiles')) {
            $this->dropFullText('service_profiles', 'marketplace_sp_fulltext_idx');
            $this->dropIndex('service_profiles', 'marketplace_sp_status_price_created_idx');
            $this->dropIndex('service_profiles', 'marketplace_sp_status_category_created_idx');
        }
    }

    private function addIndex(string $table, array $columns, string $name): void
    {
        if ($this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $schema) use ($columns, $name) {
            $schema->index($columns, $name);
        });
    }

    private function addFullText(string $table, array $columns, string $name): void
    {
        if (DB::connection()->getDriverName() !== 'mysql' || $this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $schema) use ($columns, $name) {
            $schema->fullText($columns, $name);
        });
    }

    private function dropIndex(string $table, string $name): void
    {
        if (!$this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $schema) use ($name) {
            $schema->dropIndex($name);
        });
    }

    private function dropFullText(string $table, string $name): void
    {
        if (DB::connection()->getDriverName() !== 'mysql' || !$this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $schema) use ($name) {
            $schema->dropFullText($name);
        });
    }

    private function indexExists(string $table, string $name): bool
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return false;
        }

        return DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->where('INDEX_NAME', $name)
            ->exists();
    }
};
