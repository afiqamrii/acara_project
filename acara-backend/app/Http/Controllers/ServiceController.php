<?php

namespace App\Http\Controllers;

use App\Models\ServiceProfile;
use App\Models\VendorProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Throwable;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $services = ServiceProfile::query()
            ->where('user_id', $request->user()->id)
            ->withCount([
                'bookings',
                'reviews',
                'availabilities as available_dates_count' => fn ($query) => $query->whereDate('available_date', '>=', today()),
            ])
            ->withAvg('reviews', 'rating')
            ->latest()
            ->get();

        return response()->json([
            'services' => $services->map(fn (ServiceProfile $service) => $this->mapService($service))->values(),
            'summary' => [
                'total' => $services->count(),
                'active' => $services->where('status', 'approved')->where('is_active', true)->count(),
                'paused' => $services->where('status', 'approved')->where('is_active', false)->count(),
                'pending' => $services->where('status', 'pending_verification')->count(),
                'rejected' => $services->where('status', 'rejected')->count(),
            ],
        ]);
    }

    public function show(Request $request, int $id)
    {
        $service = $this->ownedService($request, $id)
            ->withCount([
                'bookings',
                'reviews',
                'availabilities as available_dates_count' => fn ($query) => $query->whereDate('available_date', '>=', today()),
            ])
            ->withAvg('reviews', 'rating')
            ->firstOrFail();

        return response()->json(['service' => $this->mapService($service)]);
    }

    public function store(Request $request)
    {
        $approvedVendorProfile = VendorProfile::where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->latest('id')
            ->first();

        if (! $approvedVendorProfile) {
            return response()->json([
                'message' => 'Your vendor profile must be submitted and approved by admin before you can register services.',
            ], 403);
        }

        $validator = Validator::make($request->all(), $this->serviceRules(requirePortfolio: true));

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Please correct the highlighted fields before submitting your service.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $portfolioPath = $this->storePortfolio($request);

            $serviceProfile = ServiceProfile::create([
                'user_id' => $request->user()->id,
                'service_name' => $request->service_name,
                'service_category' => $request->service_category,
                'service_details' => $request->service_details,
                'pricing_starting_from' => $request->pricing_starting_from,
                'pricing_unit' => $request->pricing_unit,
                'pricing_description' => $request->pricing_description,
                'portfolio_path' => $portfolioPath,
                'status' => 'pending_verification',
                'is_active' => true,
            ]);

            return response()->json([
                'message' => 'Service application submitted successfully',
                'data' => $serviceProfile,
            ], 201);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Failed to create service profile',
            ], 500);
        }
    }

    public function update(Request $request, int $id)
    {
        $service = $this->ownedService($request, $id)->firstOrFail();
        $validated = $request->validate($this->serviceRules(requirePortfolio: false, partial: true));
        $oldPortfolioPath = $service->portfolio_path;
        $newPortfolioPath = null;

        try {
            $service->fill(collect($validated)->except('portfolio')->all());

            if ($request->hasFile('portfolio')) {
                $newPortfolioPath = $this->storePortfolio($request, $service->service_name);
                $service->portfolio_path = $newPortfolioPath;
            }

            $publicFieldsChanged = $service->isDirty([
                'service_name',
                'service_category',
                'service_details',
                'pricing_starting_from',
                'pricing_unit',
                'pricing_description',
                'portfolio_path',
            ]);

            if ($publicFieldsChanged && $service->status === 'approved') {
                $service->status = 'pending_verification';
                $service->rejection_reason = null;
                $service->rejected_at = null;
                $service->resubmitted_at = now();
            }

            $service->save();

            if ($newPortfolioPath && $oldPortfolioPath && $oldPortfolioPath !== $newPortfolioPath) {
                Storage::disk('public')->delete($oldPortfolioPath);
            }

            $this->forgetMarketplaceCache($service->id);

            return response()->json([
                'message' => $publicFieldsChanged && $service->status === 'pending_verification'
                    ? 'Service updated and submitted for verification.'
                    : 'Service updated successfully.',
                'service' => $this->freshService($request, $service->id),
            ]);
        } catch (Throwable $exception) {
            if ($newPortfolioPath) {
                Storage::disk('public')->delete($newPortfolioPath);
            }

            report($exception);

            return response()->json(['message' => 'The service could not be updated.'], 500);
        }
    }

    public function updateVisibility(Request $request, int $id)
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $service = $this->ownedService($request, $id)->firstOrFail();

        if ($service->status !== 'approved') {
            return response()->json([
                'message' => 'Only approved services can be paused or resumed.',
            ], 422);
        }

        $service->update(['is_active' => $validated['is_active']]);
        $this->forgetMarketplaceCache($service->id);

        return response()->json([
            'message' => $service->is_active
                ? 'Service resumed and is visible in the marketplace.'
                : 'Service paused and hidden from new marketplace requests.',
            'service' => $this->freshService($request, $service->id),
        ]);
    }

    public function resubmit(Request $request, int $id)
    {
        $service = $this->ownedService($request, $id)->firstOrFail();

        if ($service->status !== 'rejected') {
            return response()->json([
                'message' => 'Only rejected services can be resubmitted.',
            ], 422);
        }

        $service->update([
            'status' => 'pending_verification',
            'rejection_reason' => null,
            'rejected_at' => null,
            'resubmitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'Service resubmitted for verification.',
            'service' => $this->freshService($request, $service->id),
        ]);
    }

    private function ownedService(Request $request, int $id)
    {
        return ServiceProfile::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id);
    }

    private function freshService(Request $request, int $id): array
    {
        $service = $this->ownedService($request, $id)
            ->withCount([
                'bookings',
                'reviews',
                'availabilities as available_dates_count' => fn ($query) => $query->whereDate('available_date', '>=', today()),
            ])
            ->withAvg('reviews', 'rating')
            ->firstOrFail();

        return $this->mapService($service);
    }

    private function mapService(ServiceProfile $service): array
    {
        return [
            'id' => $service->id,
            'service_name' => $service->service_name,
            'service_category' => $service->service_category,
            'service_details' => $service->service_details,
            'pricing_starting_from' => (float) $service->pricing_starting_from,
            'pricing_unit' => $service->pricing_unit,
            'pricing_description' => $service->pricing_description,
            'portfolio_path' => $service->portfolio_path,
            'portfolio_url' => $service->portfolio_path
                ? asset('storage/'.ltrim($service->portfolio_path, '/'))
                : null,
            'status' => $service->status,
            'is_active' => (bool) $service->is_active,
            'display_status' => $service->status === 'approved' && ! $service->is_active
                ? 'paused'
                : $service->status,
            'rejection_reason' => $service->rejection_reason,
            'rejected_at' => $service->rejected_at?->toDateTimeString(),
            'resubmitted_at' => $service->resubmitted_at?->toDateTimeString(),
            'created_at' => $service->created_at?->toDateTimeString(),
            'updated_at' => $service->updated_at?->toDateTimeString(),
            'booking_count' => (int) ($service->bookings_count ?? 0),
            'review_count' => (int) ($service->reviews_count ?? 0),
            'rating_average' => $service->reviews_count
                ? round((float) $service->reviews_avg_rating, 1)
                : null,
            'available_dates_count' => (int) ($service->available_dates_count ?? 0),
        ];
    }

    private function serviceRules(bool $requirePortfolio, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'service_name' => [$required, 'string', 'max:255'],
            'service_category' => [$required, 'string', 'max:255'],
            'service_details' => [$required, 'string', 'max:1000'],
            'pricing_starting_from' => [$required, 'numeric', 'min:0'],
            'pricing_unit' => [$required, 'string', 'max:255'],
            'pricing_description' => ['nullable', 'string', 'max:500'],
            'portfolio' => [$requirePortfolio ? 'required' : 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }

    private function storePortfolio(Request $request, ?string $serviceName = null): string
    {
        $file = $request->file('portfolio');
        $timestamp = now()->format('Ymd_His_u');
        $slugName = \Illuminate\Support\Str::slug($serviceName ?: $request->service_name);
        $filename = "{$slugName}_portfolio_{$timestamp}.{$file->getClientOriginalExtension()}";

        return $file->storeAs('service_portfolios', $filename, 'public');
    }

    private function forgetMarketplaceCache(int $serviceId): void
    {
        Cache::forget('marketplace:service:'.$serviceId);
    }
}
