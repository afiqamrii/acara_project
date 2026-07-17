<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
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

        $cacheKey = 'marketplace:services:'.md5(json_encode([
            'page' => $page,
            'per_page' => $perPage,
            'search' => $search,
            'category' => $category,
            'location' => $location,
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
        ]));

        $payload = Cache::remember($cacheKey, now()->addSeconds(5), function () use (
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

            $reviewStats = DB::table('reviews')
                ->selectRaw('service_profile_id, AVG(rating) as rating_average, COUNT(*) as review_count')
                ->groupBy('service_profile_id');

            $query = DB::table('service_profiles')
                ->leftJoinSub($latestVendorProfiles, 'latest_vendor_profiles', function ($join) {
                    $join->on('latest_vendor_profiles.user_id', '=', 'service_profiles.user_id');
                })
                ->leftJoinSub($reviewStats, 'review_stats', function ($join) {
                    $join->on('review_stats.service_profile_id', '=', 'service_profiles.id');
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
                    'vendor_profiles.business_started_at',
                    'vendor_profiles.years_of_experience',
                    'users.name as user_name',
                    'review_stats.rating_average',
                    'review_stats.review_count',
                ])
                ->where('service_profiles.status', 'approved')
                ->where('service_profiles.is_active', true)
                ->when($search !== '', function ($query) use ($search) {
                    $query->where(function ($q) use ($search) {
                        $likeSearch = '%'.$this->escapeLike($search).'%';

                        $q->where('service_profiles.service_name', 'like', $likeSearch)
                            ->orWhere('service_profiles.service_category', 'like', $likeSearch)
                            ->orWhere('service_profiles.service_details', 'like', $likeSearch)
                            ->orWhere('vendor_profiles.business_name', 'like', $likeSearch);
                    });
                })
                ->when($category !== '', fn ($q) => $q->where('service_profiles.service_category', $category))
                ->when($location !== '', function ($query) use ($location) {
                    $query->where(function ($q) use ($location) {
                        $q->where('vendor_profiles.service_area_state', $location)
                            ->orWhere('vendor_profiles.service_area_town', $location);
                    });
                })
                ->when($minPrice !== null && $minPrice !== '', fn ($q) => $q->where('service_profiles.pricing_starting_from', '>=', (float) $minPrice))
                ->when($maxPrice !== null && $maxPrice !== '', fn ($q) => $q->where('service_profiles.pricing_starting_from', '<=', (float) $maxPrice))
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
                    'rating_average' => $service->review_count ? round((float) $service->rating_average, 1) : null,
                    'review_count' => (int) ($service->review_count ?? 0),
                    'portfolio_url' => $service->portfolio_path
                        ? $storageUrl.'/'.ltrim($service->portfolio_path, '/')
                        : null,
                    'vendor_experience' => $service->business_started_at
                        ? (int) Carbon::parse($service->business_started_at)->diffInYears(Carbon::now())
                        : ($service->years_of_experience !== null ? (int) $service->years_of_experience : null),
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

    public function show(int $id)
    {
        $storageUrl = rtrim(asset('storage'), '/');

        $cacheKey = 'marketplace:service:'.$id;

        $service = Cache::remember($cacheKey, now()->addSeconds(30), function () use ($id, $storageUrl) {
            $latestVendorProfiles = DB::table('vendor_profiles')
                ->selectRaw('MAX(id) as id, user_id')
                ->groupBy('user_id');

            $reviewStats = DB::table('reviews')
                ->selectRaw('service_profile_id, AVG(rating) as rating_average, COUNT(*) as review_count')
                ->groupBy('service_profile_id');

            $row = DB::table('service_profiles')
                ->leftJoinSub($latestVendorProfiles, 'latest_vendor_profiles', function ($join) {
                    $join->on('latest_vendor_profiles.user_id', '=', 'service_profiles.user_id');
                })
                ->leftJoinSub($reviewStats, 'review_stats', function ($join) {
                    $join->on('review_stats.service_profile_id', '=', 'service_profiles.id');
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
                    'service_profiles.pricing_description',
                    'service_profiles.portfolio_path',
                    'vendor_profiles.business_name',
                    'vendor_profiles.service_area_town',
                    'vendor_profiles.service_area_state',
                    'vendor_profiles.business_started_at',
                    'vendor_profiles.years_of_experience',
                    'vendor_profiles.business_link',
                    'users.name as user_name',
                    'review_stats.rating_average',
                    'review_stats.review_count',
                ])
                ->where('service_profiles.id', $id)
                ->where('service_profiles.status', 'approved')
                ->where('service_profiles.is_active', true)
                ->first();

            if (! $row) {
                return null;
            }

            $reviews = DB::table('reviews')
                ->join('users', 'users.id', '=', 'reviews.user_id')
                ->where('reviews.service_profile_id', $row->id)
                ->orderByDesc('reviews.created_at')
                ->limit(6)
                ->get([
                    'reviews.id',
                    'reviews.rating',
                    'reviews.comment',
                    'reviews.created_at',
                    'users.name as reviewer_name',
                ])
                ->map(fn ($review) => [
                    'id' => $review->id,
                    'rating' => (int) $review->rating,
                    'comment' => $review->comment,
                    'reviewer_name' => $review->reviewer_name,
                    'created_at' => Carbon::parse($review->created_at)->toDateTimeString(),
                ])
                ->values()
                ->all();

            return [
                'id' => $row->id,
                'title' => $row->title,
                'category' => $row->category,
                'description' => $row->description,
                'price' => sprintf(
                    'RM %s / %s',
                    number_format((float) $row->price_value, 2),
                    $row->pricing_unit ?: 'package'
                ),
                'price_value' => (float) $row->price_value,
                'pricing_unit' => $row->pricing_unit ?: 'package',
                'pricing_description' => $row->pricing_description,
                'location' => $this->formatLocation($row->service_area_town, $row->service_area_state),
                'location_town' => $row->service_area_town,
                'location_state' => $row->service_area_state,
                'vendor' => $row->business_name ?: ($row->user_name ?: 'ACARA Vendor'),
                'rating_average' => $row->review_count ? round((float) $row->rating_average, 1) : null,
                'review_count' => (int) ($row->review_count ?? 0),
                'reviews' => $reviews,
                'vendor_experience' => $row->business_started_at
                    ? (int) Carbon::parse($row->business_started_at)->diffInYears(Carbon::now())
                    : ($row->years_of_experience !== null ? (int) $row->years_of_experience : null),
                'vendor_website' => $row->business_link,
                'portfolio_url' => $row->portfolio_path
                    ? $storageUrl.'/'.ltrim($row->portfolio_path, '/')
                    : null,
            ];
        });

        if (! $service) {
            return response()->json(['message' => 'Service not found.'], 404);
        }

        return response()->json($service);
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
