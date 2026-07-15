<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use Illuminate\Http\Request;

class VendorDashboardController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $serviceIds = ServiceProfile::where('user_id', $user->id)->pluck('id');

        $bookings = Booking::query()
            ->whereIn('service_profile_id', $serviceIds)
            ->whereIn('status', ['pending', 'confirmed', 'completed', 'rejected', 'cancelled']);

        $confirmedValue = Booking::query()
            ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
            ->where('service_profiles.user_id', $user->id)
            ->whereIn('bookings.status', ['confirmed', 'completed'])
            ->sum('service_profiles.pricing_starting_from');

        $stats = [
            'total_bookings' => (clone $bookings)->count(),
            'pending_bookings' => (clone $bookings)->where('status', 'pending')->count(),
            'confirmed_bookings' => (clone $bookings)->where('status', 'confirmed')->count(),
            'completed_bookings' => (clone $bookings)->where('status', 'completed')->count(),
            'rejected_bookings' => (clone $bookings)->where('status', 'rejected')->count(),
            'cancelled_bookings' => (clone $bookings)->where('status', 'cancelled')->count(),
            'confirmed_value' => round((float) $confirmedValue, 2),
            'total_services' => $serviceIds->count(),
            'active_services' => ServiceProfile::where('user_id', $user->id)
                ->where('status', 'approved')
                ->count(),
            'available_dates' => ServiceAvailability::whereIn('service_profile_id', $serviceIds)
                ->whereDate('available_date', '>=', today())
                ->count(),
        ];

        $upcoming = Booking::with(['serviceProfile', 'user'])
            ->whereIn('service_profile_id', $serviceIds)
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereDate('selected_date', '>=', today())
            ->orderBy('selected_date')
            ->limit(5)
            ->get()
            ->map(fn (Booking $booking) => $this->mapBooking($booking));

        $recent = Booking::with(['serviceProfile', 'user'])
            ->whereIn('service_profile_id', $serviceIds)
            ->whereIn('status', ['pending', 'confirmed', 'completed', 'rejected', 'cancelled'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Booking $booking) => $this->mapBooking($booking));

        return response()->json([
            'business_name' => $user->vendorProfile?->business_name ?? $user->name,
            'vendor_status' => $user->vendorProfile?->status,
            'stats' => $stats,
            'upcoming_bookings' => $upcoming,
            'recent_bookings' => $recent,
        ]);
    }

    private function mapBooking(Booking $booking): array
    {
        return [
            'id' => $booking->id,
            'booking_reference' => 'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
            'service_name' => $booking->serviceProfile?->service_name ?? 'Service',
            'customer_name' => $booking->user?->name ?? 'Customer',
            'selected_date' => $booking->selected_date->format('Y-m-d'),
            'status' => $booking->status,
            'amount' => (float) ($booking->serviceProfile?->pricing_starting_from ?? 0),
            'created_at' => $booking->created_at?->toDateTimeString(),
        ];
    }
}
