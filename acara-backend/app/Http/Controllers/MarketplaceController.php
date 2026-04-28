<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MarketplaceController extends Controller
{
    public function services(Request $request)
    {
        $perPage = max(1, min((int) $request->query('per_page', 6), 24));
        $page = max(1, (int) $request->query('page', 1));
        $search = trim((string) $request->query('search', ''));
        $category = trim((string) $request->query('category', ''));
        $location = trim((string) $request->query('location', ''));
        $minPrice = $request->query('min_price');
        $maxPrice = $request->query('max_price');
        $storageUrl = rtrim(asset('storage'), '/');

        $cacheKey = 'marketplace:services:' . md5(json_encode([
            'page' => $page,
            'per_page' => $perPage,
            'search' => $search,
            'category' => $category,
            'location' => $location,
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
        ]));

        $payload = Cache::remember($cacheKey, now()->addSeconds(30), function () use (
            $page,
            $perPage,
            $search,
            $category,
            $location,
            $minPrice,
            $maxPrice,
            $storageUrl
        ) {
            $latestVendorProfiles = DB::table('vendor_profiles')
                ->selectRaw('MAX(id) as id, user_id')
                ->groupBy('user_id');

            $query = DB::table('service_profiles')
                ->leftJoinSub($latestVendorProfiles, 'latest_vendor_profiles', function ($join) {
                    $join->on('latest_vendor_profiles.user_id', '=', 'service_profiles.user_id');
                })
                ->leftJoin('vendor_profiles', 'vendor_profiles.id', '=', 'latest_vendor_profiles.id')
                ->leftJoin('users', 'users.id', '=', 'service_profiles.user_id')
                ->select([
                    'service_profiles.id',
                    'service_profiles.service_name as title',
                    'service_profiles.service_category as category',
                    'service_profiles.service_details as description',
                    'service_profiles.pricing_starting_from as price_value',
                    'service_profiles.pricing_unit',
                    'service_profiles.portfolio_path',
                    'vendor_profiles.business_name',
                    'vendor_profiles.service_area_town',
                    'vendor_profiles.service_area_state',
                    'users.name as user_name',
                ])
                ->where('service_profiles.status', 'approved')
                ->when($search !== '', function ($query) use ($search) {
                    $query->where(function ($q) use ($search) {
                        $likeSearch = '%' . $this->escapeLike($search) . '%';

                        $q->where('service_profiles.service_name', 'like', $likeSearch)
                            ->orWhere('service_profiles.service_category', 'like', $likeSearch)
                            ->orWhere('service_profiles.service_details', 'like', $likeSearch)
                            ->orWhere('vendor_profiles.business_name', 'like', $likeSearch);
                    });
                })
                ->when($category !== '', fn($q) => $q->where('service_profiles.service_category', $category))
                ->when($location !== '', function ($query) use ($location) {
                    $query->where(function ($q) use ($location) {
                        $q->where('vendor_profiles.service_area_state', $location)
                            ->orWhere('vendor_profiles.service_area_town', $location);
                    });
                })
                ->when($minPrice !== null && $minPrice !== '', fn($q) => $q->where('service_profiles.pricing_starting_from', '>=', (float) $minPrice))
                ->when($maxPrice !== null && $maxPrice !== '', fn($q) => $q->where('service_profiles.pricing_starting_from', '<=', (float) $maxPrice))
                ->orderBy('service_profiles.created_at', 'desc');

            $total = $query->clone()->count();
            $rows = $query->forPage($page, $perPage)->get();

            $transformed = $rows->map(function ($service) use ($storageUrl) {
                return [
                    'id' => $service->id,
                    'title' => $service->title,
                    'category' => $service->category,
                    'description' => $service->description,
                    'price' => sprintf(
                        'RM %s / %s',
                        number_format((float) $service->price_value, 2),
                        $service->pricing_unit ?: 'package'
                    ),
                    'price_value' => (float) $service->price_value,
                    'location' => $this->formatLocation($service->service_area_town, $service->service_area_state),
                    'vendor' => $service->business_name ?: ($service->user_name ?: 'ACARA Vendor'),
                    'portfolio_url' => $service->portfolio_path
                        ? $storageUrl . '/' . ltrim($service->portfolio_path, '/')
                        : null,
                ];
            });

            return [
                'data' => $transformed->values()->all(),
                'current_page' => $page,
                'last_page' => (int) ceil($total / $perPage),
                'total' => $total,
                'per_page' => $perPage,
            ];
        });

        return response()->json($payload);
    }

    private function formatLocation(?string $town, ?string $state): string
    {
        if ($town && $state) {
            return "{$town}, {$state}";
        }

        return $town ?: ($state ?: 'Malaysia');
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $value);
    }
}
