<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingRescheduleRequest;
use App\Models\Quotation;
use App\Models\ServiceAvailability;
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
            return response()->json(['bookings' => [], 'counts' => ['pending' => 0, 'confirmed' => 0, 'completion_pending' => 0, 'completion_disputed' => 0, 'completed' => 0, 'rejected' => 0, 'cancelled' => 0, 'expired' => 0]]);
        }

        $status = $request->query('status');

        $query = Booking::query()
            ->with(['brief', 'quotations.items', 'completions', 'rescheduleRequests', 'pendingRescheduleRequest'])
            ->whereIn('bookings.service_profile_id', $serviceIds)
            ->whereIn('bookings.status', ['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired'])
            ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
            ->join('users', 'bookings.user_id', '=', 'users.id')
            ->select([
                'bookings.id',
                'bookings.selected_date',
                'bookings.status',
                'bookings.completion_status',
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
                'bookings.confirmed_at',
                'bookings.completed_at',
                'bookings.service_name_snapshot',
                'bookings.vendor_name_snapshot',
                'bookings.price_snapshot',
                'bookings.pricing_unit_snapshot',
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
            ->orderByRaw("CASE bookings.completion_status WHEN 'completion_disputed' THEN 0 WHEN 'completion_pending' THEN 1 ELSE CASE bookings.status WHEN 'pending' THEN 2 WHEN 'confirmed' THEN 3 WHEN 'completed' THEN 4 WHEN 'expired' THEN 5 WHEN 'rejected' THEN 6 ELSE 7 END END")
            ->orderBy('bookings.selected_date', 'asc');

        if ($status && in_array($status, ['pending', 'confirmed', 'completion_pending', 'completion_disputed', 'completed', 'rejected', 'cancelled', 'expired'], true)) {
            if (in_array($status, ['completion_pending', 'completion_disputed'], true)) {
                $query->where('bookings.completion_status', $status);
            } else {
                $query->where('bookings.status', $status);
                if ($status === 'confirmed') {
                    $query->whereNull('bookings.completion_status');
                }
            }
        }

        $storageUrl = rtrim(asset('storage'), '/');

        $bookings = $query->get()->map(function ($item) use ($storageUrl) {
            $serviceName = $item->service_name_snapshot ?: $item->service_name;
            $priceValue = (float) ($item->price_snapshot ?? $item->pricing_starting_from);
            $pricingUnit = $item->pricing_unit_snapshot ?: $item->pricing_unit;
            $status = $item->completion_status ?: $item->status;

            return [
                'id' => $item->id,
                'service_id' => $item->service_id,
                'service_name' => $serviceName,
                'category' => $item->service_category,
                'price' => 'RM '.number_format($priceValue, 2),
                'price_value' => $priceValue,
                'pricing_unit' => $pricingUnit,
                'selected_date' => $item->selected_date->format('Y-m-d'),
                'status' => $status,
                'booked_at' => $item->created_at->toDateTimeString(),
                'updated_at' => $item->updated_at->toDateTimeString(),
                'notes' => $item->notes,
                'brief' => $item->brief?->toApiArray(),
                'quotation' => $item->quotations->first()?->toApiArray(),
                'quotation_history' => $item->quotations->map(fn (Quotation $quotation) => $quotation->toApiArray())->values(),
                'rejection_reason' => $item->rejection_reason,
                'cancellation_reason' => $item->cancellation_reason,
                'cancelled_by' => $item->cancelled_by,
                'rejected_at' => $item->rejected_at?->toDateTimeString(),
                'cancelled_at' => $item->cancelled_at?->toDateTimeString(),
                'expires_at' => $item->expires_at?->toDateTimeString(),
                'reminder_sent_at' => $item->reminder_sent_at?->toDateTimeString(),
                'expired_at' => $item->expired_at?->toDateTimeString(),
                'confirmed_at' => $item->confirmed_at?->toDateTimeString(),
                'completed_at' => $item->completed_at?->toDateTimeString(),
                'completion' => $item->completions->first()?->toApiArray(),
                'completion_history' => $item->completions
                    ->map(fn ($completion) => $completion->toApiArray())
                    ->values(),
                'reschedule_request' => $item->pendingRescheduleRequest?->toApiArray(),
                'reschedule_history' => $item->rescheduleRequests
                    ->map(fn (BookingRescheduleRequest $request) => $request->toApiArray())
                    ->values(),
                'timeline' => $item->activityTimeline(),
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
            'confirmed' => (clone $base)->where('status', 'confirmed')->whereNull('completion_status')->count(),
            'completion_pending' => (clone $base)->where('completion_status', 'completion_pending')->count(),
            'completion_disputed' => (clone $base)->where('completion_status', 'completion_disputed')->count(),
            'completed' => (clone $base)->where('status', 'completed')->count(),
            'rejected' => (clone $base)->where('status', 'rejected')->count(),
            'cancelled' => (clone $base)->where('status', 'cancelled')->count(),
            'expired' => (clone $base)->where('status', 'expired')->count(),
        ];

        return response()->json(['bookings' => $bookings, 'counts' => $counts]);
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

            if (Quotation::where('booking_id', $booking->id)->where('status', 'sent')->exists()) {
                return 'quotation_pending';
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

        if ($booking === 'quotation_pending') {
            return response()->json([
                'message' => 'Wait for the organizer to respond to the current quotation.',
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
                ->whereNull('completion_status')
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
            BookingRescheduleRequest::where('booking_id', $booking->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'withdrawn',
                    'decision_reason' => 'Booking was cancelled.',
                    'withdrawn_at' => now(),
                    'updated_at' => now(),
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

    /** PATCH /vendor/bookings/{id}/reschedule/approve */
    public function approveReschedule(Request $request, int $id)
    {
        $result = DB::transaction(function () use ($request, $id) {
            $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
                ->where('id', $id)
                ->where('status', 'confirmed')
                ->whereNull('completion_status')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return 'not_found';
            }

            $rescheduleRequest = BookingRescheduleRequest::where('booking_id', $booking->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if (! $rescheduleRequest) {
                return 'not_found';
            }

            if ($booking->selected_date->lte(today())
                || $rescheduleRequest->requested_date->lte(today())
                || ! $booking->selected_date->equalTo($rescheduleRequest->original_date)) {
                return 'not_eligible';
            }

            $availability = ServiceAvailability::where('service_profile_id', $booking->service_profile_id)
                ->whereDate('available_date', $rescheduleRequest->requested_date->format('Y-m-d'))
                ->lockForUpdate()
                ->first();

            $duplicateForCustomer = Booking::where('user_id', $booking->user_id)
                ->where('service_profile_id', $booking->service_profile_id)
                ->whereDate('selected_date', $rescheduleRequest->requested_date->format('Y-m-d'))
                ->where('id', '!=', $booking->id)
                ->whereIn('status', ['pending', 'confirmed', 'completed'])
                ->lockForUpdate()
                ->exists();

            if (! $availability || $duplicateForCustomer) {
                return 'unavailable';
            }

            $originalDate = $booking->selected_date->format('Y-m-d');
            $availability->delete();
            DB::table('service_availabilities')->insertOrIgnore([
                'service_profile_id' => $booking->service_profile_id,
                'available_date' => $originalDate,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $booking->update([
                'selected_date' => $rescheduleRequest->requested_date,
            ]);
            $rescheduleRequest->update([
                'status' => 'approved',
                'decided_by' => $request->user()->id,
                'decided_at' => now(),
            ]);
            $this->notifications->rescheduleApproved($booking, $rescheduleRequest);

            return $rescheduleRequest;
        });

        if ($result === 'not_found') {
            return response()->json(['message' => 'Pending date change request not found.'], 404);
        }

        if ($result === 'not_eligible') {
            return response()->json(['message' => 'This date change request can no longer be approved.'], 409);
        }

        if ($result === 'unavailable') {
            return response()->json(['message' => 'The requested date is no longer available.'], 409);
        }

        return response()->json([
            'message' => 'Date change approved.',
            'selected_date' => $result->requested_date->format('Y-m-d'),
            'reschedule_request' => $result->toApiArray(),
        ]);
    }

    /** PATCH /vendor/bookings/{id}/reschedule/reject */
    public function rejectReschedule(Request $request, int $id)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $result = DB::transaction(function () use ($request, $id, $validated) {
            $booking = Booking::whereIn('service_profile_id', $this->vendorServiceIds($request))
                ->where('id', $id)
                ->where('status', 'confirmed')
                ->whereNull('completion_status')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            $rescheduleRequest = BookingRescheduleRequest::where('booking_id', $booking->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if (! $rescheduleRequest) {
                return null;
            }

            $rescheduleRequest->update([
                'status' => 'rejected',
                'decided_by' => $request->user()->id,
                'decision_reason' => trim($validated['reason']),
                'decided_at' => now(),
            ]);
            $this->notifications->rescheduleRejected($booking, $rescheduleRequest);

            return $rescheduleRequest;
        });

        if (! $result) {
            return response()->json(['message' => 'Pending date change request not found.'], 404);
        }

        return response()->json([
            'message' => 'Date change request declined.',
            'reschedule_request' => $result->toApiArray(),
        ]);
    }
}
