<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use App\Services\BookingLifecycleService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly BookingLifecycleService $lifecycle,
    ) {}

    private function referenceFor(int $id): string
    {
        return 'ACR-'.str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    private function locationFrom($item): string
    {
        return trim(implode(', ', array_filter([
            $item->service_area_town,
            $item->service_area_state,
        ]))) ?: 'Malaysia';
    }

    private function priceLabel($amount): string
    {
        return 'RM '.number_format((float) $amount, 2);
    }

    private function formatDate($value): string
    {
        return method_exists($value, 'format')
            ? $value->format('Y-m-d')
            : date('Y-m-d', strtotime($value));
    }

    private function formatDateTime($value): ?string
    {
        if (! $value) {
            return null;
        }

        return method_exists($value, 'toDateTimeString')
            ? $value->toDateTimeString()
            : date('Y-m-d H:i:s', strtotime($value));
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

    private function mapCustomerBooking($item): array
    {
        $serviceName = $item->service_name_snapshot ?: $item->service_name;
        $vendorName = $item->vendor_name_snapshot ?: $item->business_name;
        $priceValue = (float) ($item->price_snapshot ?? $item->pricing_starting_from);
        $pricingUnit = $item->pricing_unit_snapshot ?: $item->pricing_unit;
        $selectedDate = $this->formatDate($item->selected_date);

        return [
            'id' => $item->id,
            'booking_reference' => $this->referenceFor((int) $item->id),
            'service_id' => $item->service_id,
            'service_name' => $serviceName,
            'event_name' => $serviceName,
            'category' => $item->service_category,
            'vendor' => $vendorName,
            'vendor_name' => $vendorName,
            'location' => $this->locationFrom($item),
            'price' => $this->priceLabel($priceValue),
            'price_value' => $priceValue,
            'total_amount' => $priceValue,
            'pricing_unit' => $pricingUnit,
            'selected_date' => $selectedDate,
            'event_date' => $selectedDate,
            'status' => $item->status,
            'payment_status' => in_array($item->status, ['confirmed', 'completed'], true) ? 'pending' : 'unpaid',
            'booked_at' => $this->formatDateTime($item->created_at),
            'notes' => $item->notes ?? null,
            'rejection_reason' => $item->rejection_reason ?? null,
            'cancellation_reason' => $item->cancellation_reason ?? null,
            'cancelled_by' => $item->cancelled_by ?? null,
            'rejected_at' => $this->formatDateTime($item->rejected_at ?? null),
            'cancelled_at' => $this->formatDateTime($item->cancelled_at ?? null),
            'expires_at' => $this->formatDateTime($item->expires_at ?? null),
            'reminder_sent_at' => $this->formatDateTime($item->reminder_sent_at ?? null),
            'expired_at' => $this->formatDateTime($item->expired_at ?? null),
            'confirmed_at' => $this->formatDateTime($item->confirmed_at ?? null),
            'completed_at' => $this->formatDateTime($item->completed_at ?? null),
            'timeline' => $item->activityTimeline(),
        ];
    }

    private function bookingSummary($items): array
    {
        return [
            'total' => $items->count(),
            'pending' => $items->where('status', 'pending')->count(),
            'confirmed' => $items->where('status', 'confirmed')->count(),
            'completed' => $items->where('status', 'completed')->count(),
            'rejected' => $items->where('status', 'rejected')->count(),
            'cancelled' => $items->where('status', 'cancelled')->count(),
            'expired' => $items->where('status', 'expired')->count(),
            'estimate' => round((float) $items->sum('price_value'), 2),
        ];
    }

    // GET /bookings/cart
    public function cartIndex(Request $request)
    {
        $userId = $request->user()->id;

        $items = Booking::query()
            ->where('bookings.user_id', $userId)
            ->where('bookings.status', 'cart')
            ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
            ->join(
                DB::raw('(SELECT user_id, MAX(id) as id FROM vendor_profiles GROUP BY user_id) as vp_latest'),
                'service_profiles.user_id', '=', 'vp_latest.user_id'
            )
            ->join('vendor_profiles', 'vp_latest.id', '=', 'vendor_profiles.id')
            ->select([
                'bookings.id',
                'bookings.selected_date',
                'bookings.status',
                'service_profiles.id as service_id',
                'service_profiles.service_name',
                'service_profiles.service_category',
                'service_profiles.pricing_starting_from',
                'service_profiles.pricing_unit',
                'vendor_profiles.business_name',
                'vendor_profiles.service_area_state',
                'vendor_profiles.service_area_town',
            ])
            ->orderBy('bookings.created_at', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'service_id' => $item->service_id,
                    'service_name' => $item->service_name,
                    'category' => $item->service_category,
                    'vendor' => $item->business_name,
                    'location' => $this->locationFrom($item),
                    'price' => $this->priceLabel($item->pricing_starting_from),
                    'price_value' => (float) $item->pricing_starting_from,
                    'pricing_unit' => $item->pricing_unit,
                    'selected_date' => $this->formatDate($item->selected_date),
                ];
            });

        return response()->json(['items' => $items]);
    }

    // POST /bookings/cart
    public function addToCart(Request $request)
    {
        $validated = $request->validate([
            'service_id' => 'required|integer|exists:service_profiles,id',
            'date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'notes' => 'nullable|string|max:1000',
        ]);

        $serviceId = $validated['service_id'];
        $date = $validated['date'];
        $userId = $request->user()->id;

        $service = ServiceProfile::find($serviceId);
        if (! $service || $service->status !== 'approved' || ! $service->is_active) {
            return response()->json(['message' => 'Service is not available.'], 422);
        }

        $dateAvailable = ServiceAvailability::where('service_profile_id', $serviceId)
            ->whereDate('available_date', $date)
            ->exists();

        if (! $dateAvailable) {
            return response()->json(['message' => 'This date is no longer available.'], 422);
        }

        $existing = Booking::where('user_id', $userId)
            ->where('service_profile_id', $serviceId)
            ->whereDate('selected_date', $date)
            ->whereIn('status', ['cart', 'pending', 'confirmed', 'completed'])
            ->first();

        if ($existing) {
            $msg = $existing->status === 'cart'
                ? 'This item is already in your cart.'
                : 'You have already booked this service on this date.';

            return response()->json(['message' => $msg], 409);
        }

        $booking = Booking::create([
            'user_id' => $userId,
            'service_profile_id' => $serviceId,
            'selected_date' => $date,
            'status' => 'cart',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Added to cart.',
            'booking_id' => $booking->id,
        ], 201);
    }

    // DELETE /bookings/cart/{id}
    public function removeFromCart(Request $request, $id)
    {
        $booking = Booking::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'cart')
            ->first();

        if (! $booking) {
            return response()->json(['message' => 'Item not found in cart.'], 404);
        }

        $booking->delete();

        return response()->json(['message' => 'Item removed from cart.']);
    }

    // POST /bookings/confirm
    public function confirmCart(Request $request)
    {
        $userId = $request->user()->id;
        $cartItems = Booking::where('user_id', $userId)
            ->where('status', 'cart')
            ->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Your cart is empty.'], 422);
        }

        $unavailableIds = DB::transaction(function () use ($cartItems) {
            $lockedItems = [];
            $unavailableIds = [];

            foreach ($cartItems as $item) {
                $dateStr = $item->selected_date->format('Y-m-d');

                $service = ServiceProfile::query()
                    ->where('id', $item->service_profile_id)
                    ->lockForUpdate()
                    ->first();

                $availability = ServiceAvailability::where('service_profile_id', $item->service_profile_id)
                    ->whereDate('available_date', $dateStr)
                    ->lockForUpdate()
                    ->first();

                $duplicateForCustomer = Booking::where('user_id', $item->user_id)
                    ->where('service_profile_id', $item->service_profile_id)
                    ->whereDate('selected_date', $dateStr)
                    ->where('id', '!=', $item->id)
                    ->whereIn('status', ['pending', 'confirmed', 'completed'])
                    ->lockForUpdate()
                    ->exists();

                if (! $service
                    || $service->status !== 'approved'
                    || ! $service->is_active
                    || ! $availability
                    || $duplicateForCustomer) {
                    $unavailableIds[] = $item->id;

                    continue;
                }

                $service->loadMissing('user');
                $vendorName = DB::table('vendor_profiles')
                    ->where('user_id', $service->user_id)
                    ->latest('id')
                    ->value('business_name') ?: ($service->user?->name ?? 'Vendor');

                $lockedItems[] = [$item, $availability, [
                    'service_name_snapshot' => $service->service_name,
                    'vendor_name_snapshot' => $vendorName,
                    'price_snapshot' => $service->pricing_starting_from,
                    'pricing_unit_snapshot' => $service->pricing_unit,
                ]];
            }

            if (! empty($unavailableIds)) {
                return $unavailableIds;
            }

            foreach ($lockedItems as [$item, $availability, $snapshot]) {
                $availability->delete();
                $item->update(array_merge($snapshot, [
                    'status' => 'pending',
                    'expires_at' => now()->addHours(max(1, (int) config('acara.booking_lifecycle.response_hours', 48))),
                    'reminder_sent_at' => null,
                    'expired_at' => null,
                    'confirmed_at' => null,
                    'completed_at' => null,
                ]));
                $this->notifications->bookingSubmitted($item);
            }

            return [];
        });

        if (! empty($unavailableIds)) {
            return response()->json([
                'message' => 'Some selected dates are no longer available. Please remove them and try again.',
                'unavailable_ids' => $unavailableIds,
            ], 422);
        }

        return response()->json([
            'message' => 'Booking request submitted! Vendors will be notified.',
            'booking_count' => $cartItems->count(),
        ]);
    }

    // GET /bookings - customer booking history
    public function myBookings(Request $request)
    {
        $userId = $request->user()->id;

        $bookings = Booking::query()
            ->where('bookings.user_id', $userId)
            ->whereIn('bookings.status', ['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired'])
            ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
            ->join(
                DB::raw('(SELECT user_id, MAX(id) as id FROM vendor_profiles GROUP BY user_id) as vp_latest'),
                'service_profiles.user_id', '=', 'vp_latest.user_id'
            )
            ->join('vendor_profiles', 'vp_latest.id', '=', 'vendor_profiles.id')
            ->select([
                'bookings.id',
                'bookings.selected_date',
                'bookings.status',
                'bookings.created_at',
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
                'vendor_profiles.business_name',
                'vendor_profiles.service_area_state',
                'vendor_profiles.service_area_town',
            ])
            ->orderBy('bookings.created_at', 'desc')
            ->get()
            ->map(fn ($item) => $this->mapCustomerBooking($item));

        return response()->json([
            'bookings' => $bookings,
            'stats' => $this->bookingSummary($bookings),
        ]);
    }

    // PATCH /bookings/{id}/cancel - customer cancellation
    public function cancelBooking(Request $request, int $id)
    {
        $booking = DB::transaction(function () use ($request, $id) {
            $booking = Booking::where('id', $id)
                ->where('user_id', $request->user()->id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            if ($this->lifecycle->expireIfOverdue($booking)) {
                return 'expired';
            }

            $booking->update([
                'status' => 'cancelled',
                'cancelled_by' => 'customer',
                'cancelled_at' => now(),
            ]);
            $this->releaseDateIfFuture($booking);
            $this->notifications->bookingCancelledByOrganizer($booking);

            return $booking;
        });

        if ($booking === 'expired') {
            return response()->json([
                'message' => 'This booking request has expired and the date was released automatically.',
            ], 409);
        }

        if (! $booking) {
            return response()->json(['message' => 'Booking not found or cannot be cancelled.'], 404);
        }

        return response()->json(['message' => 'Booking cancelled.']);
    }

    // GET /admin/bookings - admin monitor
    public function adminBookings()
    {
        $bookings = Booking::query()
            ->whereIn('bookings.status', ['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired'])
            ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
            ->join('users as customers', 'bookings.user_id', '=', 'customers.id')
            ->join('users as vendors', 'service_profiles.user_id', '=', 'vendors.id')
            ->leftJoin(
                DB::raw('(SELECT user_id, MAX(id) as id FROM vendor_profiles GROUP BY user_id) as vp_latest'),
                'service_profiles.user_id', '=', 'vp_latest.user_id'
            )
            ->leftJoin('vendor_profiles', 'vp_latest.id', '=', 'vendor_profiles.id')
            ->select([
                'bookings.id',
                'bookings.selected_date',
                'bookings.status',
                'bookings.created_at',
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
                'customers.name as customer_name',
                'customers.email as customer_email',
                DB::raw('COALESCE(vendor_profiles.business_name, vendors.name) as business_name'),
                'vendor_profiles.service_area_state',
                'vendor_profiles.service_area_town',
            ])
            ->orderByRaw("CASE bookings.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'completed' THEN 2 WHEN 'expired' THEN 3 WHEN 'rejected' THEN 4 ELSE 5 END")
            ->orderBy('bookings.created_at', 'desc')
            ->get()
            ->map(function ($item) {
                return array_merge($this->mapCustomerBooking($item), [
                    'customer_name' => $item->customer_name,
                    'customer_email' => $item->customer_email,
                ]);
            });

        return response()->json([
            'bookings' => $bookings,
            'stats' => $this->bookingSummary($bookings),
        ]);
    }
}
