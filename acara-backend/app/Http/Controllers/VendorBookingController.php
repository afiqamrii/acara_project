<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VendorBookingController extends Controller
{
    private function vendorServiceIds(Request $request)
    {
        return ServiceProfile::where('user_id', $request->user()->id)->pluck('id');
    }

    /** GET /vendor/bookings */
    public function index(Request $request)
    {
        $serviceIds = $this->vendorServiceIds($request);

        if ($serviceIds->isEmpty()) {
            return response()->json(['bookings' => [], 'counts' => ['pending' => 0, 'confirmed' => 0, 'completed' => 0, 'cancelled' => 0]]);
        }

        $status = $request->query('status');

        $query = Booking::query()
            ->whereIn('bookings.service_profile_id', $serviceIds)
            ->whereIn('bookings.status', ['pending', 'confirmed', 'completed', 'cancelled'])
            ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
            ->join('users', 'bookings.user_id', '=', 'users.id')
            ->select([
                'bookings.id',
                'bookings.selected_date',
                'bookings.status',
                'bookings.created_at',
                'bookings.updated_at',
                'bookings.notes',
                'service_profiles.id as service_id',
                'service_profiles.service_name',
                'service_profiles.service_category',
                'service_profiles.pricing_starting_from',
                'service_profiles.pricing_unit',
                'service_profiles.portfolio_path',
                'users.id as customer_id',
                'users.name as customer_name',
                'users.email as customer_email',
                'users.phone_number as customer_phone',
            ])
            ->orderByRaw("FIELD(bookings.status, 'pending', 'confirmed', 'completed', 'cancelled')")
            ->orderBy('bookings.selected_date', 'asc');

        if ($status && in_array($status, ['pending', 'confirmed', 'completed', 'cancelled'])) {
            $query->where('bookings.status', $status);
        }

        $storageUrl = rtrim(asset('storage'), '/');

        $bookings = $query->get()->map(function ($item) use ($storageUrl) {
            return [
                'id'            => $item->id,
                'service_id'    => $item->service_id,
                'service_name'  => $item->service_name,
                'category'      => $item->service_category,
                'price'         => 'RM ' . number_format($item->pricing_starting_from, 2),
                'price_value'   => (float) $item->pricing_starting_from,
                'pricing_unit'  => $item->pricing_unit,
                'selected_date' => $item->selected_date->format('Y-m-d'),
                'status'        => $item->status,
                'booked_at'     => $item->created_at->toDateTimeString(),
                'updated_at'    => $item->updated_at->toDateTimeString(),
                'notes'         => $item->notes,
                'portfolio_url' => $item->portfolio_path
                    ? $storageUrl . '/' . ltrim($item->portfolio_path, '/')
                    : null,
                'customer'      => [
                    'id'    => $item->customer_id,
                    'name'  => $item->customer_name,
                    'email' => $item->customer_email,
                    'phone' => $item->customer_phone,
                ],
            ];
        });

        $base   = Booking::whereIn('service_profile_id', $serviceIds)->whereIn('status', ['pending', 'confirmed', 'completed', 'cancelled']);
        $counts = [
            'pending'   => (clone $base)->where('status', 'pending')->count(),
            'confirmed' => (clone $base)->where('status', 'confirmed')->count(),
            'completed' => (clone $base)->where('status', 'completed')->count(),
            'cancelled' => (clone $base)->where('status', 'cancelled')->count(),
        ];

        return response()->json(['bookings' => $bookings, 'counts' => $counts]);
    }

    /** PATCH /vendor/bookings/{id}/approve */
    public function approve(Request $request, int $id)
    {
        $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
            ->where('id', $id)
            ->where('status', 'pending')
            ->first();

        if (! $booking) {
            return response()->json(['message' => 'Booking not found or already processed.'], 404);
        }

        $booking->update(['status' => 'confirmed']);

        return response()->json(['message' => 'Booking approved.', 'status' => 'confirmed']);
    }

    /** PATCH /vendor/bookings/{id}/complete */
    public function complete(Request $request, int $id)
    {
        $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
            ->where('id', $id)
            ->where('status', 'confirmed')
            ->first();

        if (! $booking) {
            return response()->json(['message' => 'Booking not found or not confirmed.'], 404);
        }

        $booking->update(['status' => 'completed']);

        return response()->json(['message' => 'Booking marked as completed.', 'status' => 'completed']);
    }

    /** PATCH /vendor/bookings/{id}/cancel */
    public function cancel(Request $request, int $id)
    {
        $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
            ->where('id', $id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->first();

        if (! $booking) {
            return response()->json(['message' => 'Booking not found or already cancelled.'], 404);
        }

        DB::transaction(function () use ($booking) {
            $booking->update(['status' => 'cancelled']);

            if ($booking->selected_date->gte(today())) {
                ServiceAvailability::firstOrCreate([
                    'service_profile_id' => $booking->service_profile_id,
                    'available_date' => $booking->selected_date->format('Y-m-d'),
                ]);
            }
        });

        return response()->json(['message' => 'Booking cancelled.', 'status' => 'cancelled']);
    }
}
