<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('service_name_snapshot')->nullable()->after('service_profile_id');
            $table->string('vendor_name_snapshot')->nullable()->after('service_name_snapshot');
            $table->decimal('price_snapshot', 12, 2)->nullable()->after('vendor_name_snapshot');
            $table->string('pricing_unit_snapshot')->nullable()->after('price_snapshot');
            $table->timestamp('confirmed_at')->nullable()->after('expired_at');
            $table->timestamp('completed_at')->nullable()->after('confirmed_at');
        });

        $latestVendorProfiles = DB::table('vendor_profiles')
            ->selectRaw('user_id, MAX(id) as id')
            ->groupBy('user_id');

        $lastId = 0;

        do {
            $rows = DB::table('bookings')
                ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
                ->join('users as vendors', 'service_profiles.user_id', '=', 'vendors.id')
                ->leftJoinSub($latestVendorProfiles, 'vp_latest', function ($join) {
                    $join->on('service_profiles.user_id', '=', 'vp_latest.user_id');
                })
                ->leftJoin('vendor_profiles', 'vp_latest.id', '=', 'vendor_profiles.id')
                ->where('bookings.id', '>', $lastId)
                ->orderBy('bookings.id')
                ->limit(500)
                ->get([
                    'bookings.id as booking_id',
                    'bookings.status',
                    'bookings.updated_at',
                    'service_profiles.service_name',
                    'service_profiles.pricing_starting_from',
                    'service_profiles.pricing_unit',
                    DB::raw('COALESCE(vendor_profiles.business_name, vendors.name) as vendor_name'),
                ]);

            foreach ($rows as $row) {
                DB::table('bookings')->where('id', $row->booking_id)->update([
                    'service_name_snapshot' => $row->service_name,
                    'vendor_name_snapshot' => $row->vendor_name,
                    'price_snapshot' => $row->pricing_starting_from,
                    'pricing_unit_snapshot' => $row->pricing_unit,
                    'confirmed_at' => $row->status === 'confirmed' ? $row->updated_at : null,
                    'completed_at' => $row->status === 'completed' ? $row->updated_at : null,
                ]);

                $lastId = (int) $row->booking_id;
            }
        } while ($rows->isNotEmpty());
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'service_name_snapshot',
                'vendor_name_snapshot',
                'price_snapshot',
                'pricing_unit_snapshot',
                'confirmed_at',
                'completed_at',
            ]);
        });
    }
};
