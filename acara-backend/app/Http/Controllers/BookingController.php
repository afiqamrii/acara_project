<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceProfile;
use App\Models\ServiceAvailability;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    private function referenceFor(int $id): string
    {
        return 'ACR-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
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
        return 'RM ' . number_format((float) $amount, 2);
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

        ServiceAvailability::firstOrCreate([
            'service_profile_id' => $booking->service_profile_id,
            'available_date'     => $booking->selected_date->format('Y-m-d'),
        ]);
    }

    private function mapCustomerBooking($item): array
    {
        $priceValue = (float) $item->pricing_starting_from;
        $selectedDate = $this->formatDate($item->selected_date);

        return [
            'id'                => $item->id,
            'booking_reference' => $this->referenceFor((int) $item->id),
            'service_id'        => $item->service_id,
            'service_name'      => $item->service_name,
            'event_name'        => $item->service_name,
            'category'          => $item->service_category,
            'vendor'            => $item->business_name,
            'vendor_name'       => $item->business_name,
            'location'          => $this->locationFrom($item),
            'price'             => $this->priceLabel($priceValue),
            'price_value'       => $priceValue,
            'total_amount'      => $priceValue,
            'pricing_unit'      => $item->pricing_unit,
            'selected_date'     => $selectedDate,
            'event_date'        => $selectedDate,
            'status'            => $item->status,
            'payment_status'    => in_array($item->status, ['confirmed', 'completed'], true) ? 'pending' : 'unpaid',
            'booked_at'         => $this->formatDateTime($item->created_at),
        ];
    }

    private function bookingSummary($items): array
    {
        return [
            'total'      => $items->count(),
            'pending'    => $items->where('status', 'pending')->count(),
            'confirmed'  => $items->where('status', 'confirmed')->count(),
            'completed'  => $items->where('status', 'completed')->count(),
            'cancelled'  => $items->where('status', 'cancelled')->count(),
            'estimate'   => round((float) $items->sum('price_value'), 2),
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
                    'id'            => $item->id,
                    'service_id'    => $item->service_id,
                    'service_name'  => $item->service_name,
                    'category'      => $item->service_category,
                    'vendor'        => $item->business_name,
                    'location'      => $this->locationFrom($item),
                    'price'         => $this->priceLabel($item->pricing_starting_from),
                    'price_value'   => (float) $item->pricing_starting_from,
                    'pricing_unit'  => $item->pricing_unit,
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
            'date'       => 'required|date_format:Y-m-d|after_or_equal:today',
            'notes'      => 'nullable|string|max:1000',
        ]);

        $serviceId = $validated['service_id'];
        $date      = $validated['date'];
        $userId    = $request->user()->id;

        $service = ServiceProfile::find($serviceId);
        if (! $service || $service->status !== 'approved') {
            return response()->json(['message' => 'Service is not available.'], 422);
        }

        $dateAvailable = ServiceAvailability::where('service_profile_id', $serviceId)
            ->where('available_date', $date)
            ->exists();

        if (! $dateAvailable) {
            return response()->json(['message' => 'This date is no longer available.'], 422);
        }

        $existing = Booking::where('user_id', $userId)
            ->where('service_profile_id', $serviceId)
            ->where('selected_date', $date)
            ->first();

        if ($existing) {
            $msg = $existing->status === 'cart'
                ? 'This item is already in your cart.'
                : 'You have already booked this service on this date.';

            return response()->json(['message' => $msg], 409);
        }

        $booking = Booking::create([
            'user_id'            => $userId,
            'service_profile_id' => $serviceId,
            'selected_date'      => $date,
            'status'             => 'cart',
            'notes'              => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message'    => 'Added to cart.',
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
        $userId    = $request->user()->id;
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

                $availability = ServiceAvailability::where('service_profile_id', $item->service_profile_id)
                    ->where('available_date', $dateStr)
                    ->lockForUpdate()
                    ->first();

                $alreadyBooked = Booking::where('service_profile_id', $item->service_profile_id)
                    ->where('selected_date', $dateStr)
                    ->whereIn('status', ['pending', 'confirmed', 'completed'])
                    ->lockForUpdate()
                    ->exists();

                if (! $availability || $alreadyBooked) {
                    $unavailableIds[] = $item->id;
                    continue;
                }

                $lockedItems[] = [$item, $availability];
            }

            if (! empty($unavailableIds)) {
                return $unavailableIds;
            }

            foreach ($lockedItems as [$item, $availability]) {
                $availability->delete();
                $item->update(['status' => 'pending']);
            }

            return [];
        });

        if (! empty($unavailableIds)) {
            return response()->json([
                'message'          => 'Some selected dates are no longer available. Please remove them and try again.',
                'unavailable_ids'  => $unavailableIds,
            ], 422);
        }

        return response()->json([
            'message'       => 'Booking request submitted! Vendors will be notified.',
            'booking_count' => $cartItems->count(),
        ]);
    }

    // GET /bookings - customer booking history
    public function myBookings(Request $request)
    {
        $userId = $request->user()->id;

        $bookings = Booking::query()
            ->where('bookings.user_id', $userId)
            ->whereIn('bookings.status', ['pending', 'confirmed', 'completed', 'cancelled'])
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
            'stats'    => $this->bookingSummary($bookings),
        ]);
    }

    // PATCH /bookings/{id}/cancel - customer cancellation
    public function cancelBooking(Request $request, int $id)
    {
        $booking = Booking::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->first();

        if (! $booking) {
            return response()->json(['message' => 'Booking not found or cannot be cancelled.'], 404);
        }

        DB::transaction(function () use ($booking) {
            $booking->update(['status' => 'cancelled']);
            $this->releaseDateIfFuture($booking);
        });

        return response()->json(['message' => 'Booking cancelled.']);
    }

    // GET /admin/bookings - admin monitor
    public function adminBookings()
    {
        $bookings = Booking::query()
            ->whereIn('bookings.status', ['pending', 'confirmed', 'completed', 'cancelled'])
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
            ->orderByRaw("CASE bookings.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END")
            ->orderBy('bookings.created_at', 'desc')
            ->get()
            ->map(function ($item) {
                return array_merge($this->mapCustomerBooking($item), [
                    'customer_name'  => $item->customer_name,
                    'customer_email' => $item->customer_email,
                ]);
            });

        return response()->json([
            'bookings' => $bookings,
            'stats'    => $this->bookingSummary($bookings),
        ]);
    }
}
