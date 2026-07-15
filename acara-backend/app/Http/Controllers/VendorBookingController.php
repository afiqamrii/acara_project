<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceProfile;
use App\Services\BookingLifecycleService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VendorBookingController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly BookingLifecycleService $lifecycle,
    ) {}

    private function vendorServiceIds(Request $request)
    {
        return ServiceProfile::where('user_id', $request->user()->id)->pluck('id');
    }

    private function releaseDateIfFuture(Booking $booking): void
    {
        if ($booking->selected_date->lt(today())) {
            return;
        }

        DB::table('service_availabilities')->insertOrIgnore([
            'service_profile_id' => $booking->service_profile_id,
            'available_date' => $booking->selected_date->format('Y-m-d'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** GET /vendor/bookings */
    public function index(Request $request)
    {
        $serviceIds = $this->vendorServiceIds($request);

        if ($serviceIds->isEmpty()) {
            return response()->json(['bookings' => [], 'counts' => ['pending' => 0, 'confirmed' => 0, 'completed' => 0, 'rejected' => 0, 'cancelled' => 0, 'expired' => 0]]);
        }

        $status = $request->query('status');

        $query = Booking::query()
            ->whereIn('bookings.service_profile_id', $serviceIds)
            ->whereIn('bookings.status', ['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired'])
            ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
            ->join('users', 'bookings.user_id', '=', 'users.id')
            ->select([
                'bookings.id',
                'bookings.selected_date',
                'bookings.status',
                'bookings.created_at',
                'bookings.updated_at',
                'bookings.notes',
                'bookings.rejection_reason',
                'bookings.cancellation_reason',
                'bookings.cancelled_by',
                'bookings.rejected_at',
                'bookings.cancelled_at',
                'bookings.expires_at',
                'bookings.reminder_sent_at',
                'bookings.expired_at',
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
            ->orderByRaw("CASE bookings.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'completed' THEN 2 WHEN 'expired' THEN 3 WHEN 'rejected' THEN 4 ELSE 5 END")
            ->orderBy('bookings.selected_date', 'asc');

        if ($status && in_array($status, ['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired'], true)) {
            $query->where('bookings.status', $status);
        }

        $storageUrl = rtrim(asset('storage'), '/');

        $bookings = $query->get()->map(function ($item) use ($storageUrl) {
            return [
                'id' => $item->id,
                'service_id' => $item->service_id,
                'service_name' => $item->service_name,
                'category' => $item->service_category,
                'price' => 'RM '.number_format($item->pricing_starting_from, 2),
                'price_value' => (float) $item->pricing_starting_from,
                'pricing_unit' => $item->pricing_unit,
                'selected_date' => $item->selected_date->format('Y-m-d'),
                'status' => $item->status,
                'booked_at' => $item->created_at->toDateTimeString(),
                'updated_at' => $item->updated_at->toDateTimeString(),
                'notes' => $item->notes,
                'rejection_reason' => $item->rejection_reason,
                'cancellation_reason' => $item->cancellation_reason,
                'cancelled_by' => $item->cancelled_by,
                'rejected_at' => $item->rejected_at?->toDateTimeString(),
                'cancelled_at' => $item->cancelled_at?->toDateTimeString(),
                'expires_at' => $item->expires_at?->toDateTimeString(),
                'reminder_sent_at' => $item->reminder_sent_at?->toDateTimeString(),
                'expired_at' => $item->expired_at?->toDateTimeString(),
                'portfolio_url' => $item->portfolio_path
                    ? $storageUrl.'/'.ltrim($item->portfolio_path, '/')
                    : null,
                'customer' => [
                    'id' => $item->customer_id,
                    'name' => $item->customer_name,
                    'email' => $item->customer_email,
                    'phone' => $item->customer_phone,
                ],
            ];
        });

        $base = Booking::whereIn('service_profile_id', $serviceIds)->whereIn('status', ['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired']);
        $counts = [
            'pending' => (clone $base)->where('status', 'pending')->count(),
            'confirmed' => (clone $base)->where('status', 'confirmed')->count(),
            'completed' => (clone $base)->where('status', 'completed')->count(),
            'rejected' => (clone $base)->where('status', 'rejected')->count(),
            'cancelled' => (clone $base)->where('status', 'cancelled')->count(),
            'expired' => (clone $base)->where('status', 'expired')->count(),
        ];

        return response()->json(['bookings' => $bookings, 'counts' => $counts]);
    }

    /** PATCH /vendor/bookings/{id}/approve */
    public function approve(Request $request, int $id)
    {
        $booking = DB::transaction(function () use ($request, $id) {
            $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
                ->where('id', $id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            if ($this->lifecycle->expireIfOverdue($booking)) {
                return 'expired';
            }

            $booking->update(['status' => 'confirmed']);
            $this->notifications->bookingApproved($booking);

            return $booking;
        });

        if ($booking === 'expired') {
            return response()->json([
                'message' => 'This booking request expired before it could be approved.',
            ], 409);
        }

        if (! $booking) {
            return response()->json(['message' => 'Booking not found or already processed.'], 404);
        }

        return response()->json(['message' => 'Booking approved.', 'status' => 'confirmed']);
    }

    /** PATCH /vendor/bookings/{id}/complete */
    public function complete(Request $request, int $id)
    {
        $booking = DB::transaction(function () use ($request, $id) {
            $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
                ->where('id', $id)
                ->where('status', 'confirmed')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            $booking->update(['status' => 'completed']);
            $this->notifications->bookingCompleted($booking);

            return $booking;
        });

        if (! $booking) {
            return response()->json(['message' => 'Booking not found or not confirmed.'], 404);
        }

        return response()->json(['message' => 'Booking marked as completed.', 'status' => 'completed']);
    }

    /** PATCH /vendor/bookings/{id}/reject */
    public function reject(Request $request, int $id)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $booking = DB::transaction(function () use ($request, $id, $validated) {
            $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
                ->where('id', $id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            if ($this->lifecycle->expireIfOverdue($booking)) {
                return 'expired';
            }

            $booking->update([
                'status' => 'rejected',
                'rejection_reason' => trim($validated['reason']),
                'rejected_at' => now(),
            ]);
            $this->releaseDateIfFuture($booking);
            $this->notifications->bookingRejected($booking);

            return $booking;
        });

        if ($booking === 'expired') {
            return response()->json([
                'message' => 'This booking request expired before it could be rejected.',
            ], 409);
        }

        if (! $booking) {
            return response()->json(['message' => 'Booking request not found or already processed.'], 404);
        }

        return response()->json([
            'message' => 'Booking request rejected.',
            'status' => 'rejected',
            'reason' => $booking->rejection_reason,
        ]);
    }

    /** PATCH /vendor/bookings/{id}/cancel */
    public function cancel(Request $request, int $id)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $booking = DB::transaction(function () use ($request, $id, $validated) {
            $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
                ->where('id', $id)
                ->where('status', 'confirmed')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            $booking->update([
                'status' => 'cancelled',
                'cancellation_reason' => trim($validated['reason']),
                'cancelled_by' => 'vendor',
                'cancelled_at' => now(),
            ]);
            $this->releaseDateIfFuture($booking);
            $this->notifications->bookingCancelledByVendor($booking);

            return $booking;
        });

        if (! $booking) {
            return response()->json(['message' => 'Confirmed booking not found or already processed.'], 404);
        }

        return response()->json([
            'message' => 'Booking cancelled.',
            'status' => 'cancelled',
            'reason' => $booking->cancellation_reason,
        ]);
    }
}
