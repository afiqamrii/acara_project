<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceProfile;
use App\Models\ServiceAvailability;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    // GET /bookings/cart
    public function cartIndex(Request $request)
    {
        $userId = $request->user()->id;

        $items = Booking::query()
            ->where('bookings.user_id', $userId)
            ->where('bookings.status', 'cart')
            ->join('service_profiles', 'bookings.service_profile_id', '=', 'service_profiles.id')
            ->leftJoin(
                DB::raw('(SELECT user_id, MAX(id) as id FROM vendor_profiles GROUP BY user_id) as vp_latest'),
                'service_profiles.user_id', '=', 'vp_latest.user_id'
            )
            ->leftJoin('vendor_profiles', 'vp_latest.id', '=', 'vendor_profiles.id')
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
                $location = trim(implode(', ', array_filter([
                    $item->service_area_town,
                    $item->service_area_state,
                ])));

                return [
                    'id'            => $item->id,
                    'service_id'    => $item->service_id,
                    'service_name'  => $item->service_name,
                    'category'      => $item->service_category,
                    'vendor'        => $item->business_name ?? 'Unknown Vendor',
                    'location'      => $location ?: 'Malaysia',
                    'price'         => 'RM ' . number_format($item->pricing_starting_from, 2),
                    'price_value'   => (float) $item->pricing_starting_from,
                    'pricing_unit'  => $item->pricing_unit ?? 'pax',
                    'selected_date' => $item->selected_date->format('Y-m-d'),
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

        // Validate all dates still available before committing.
        // ServiceAvailability is the single source of truth — if the vendor
        // re-opened a booked date it will exist here, allowing multiple bookings.
        $unavailableIds = [];
        foreach ($cartItems as $item) {
            $dateStr = $item->selected_date->format('Y-m-d');

            $stillAvailable = ServiceAvailability::where('service_profile_id', $item->service_profile_id)
                ->where('available_date', $dateStr)
                ->exists();

            if (! $stillAvailable) {
                $unavailableIds[] = $item->id;
            }
        }

        if (! empty($unavailableIds)) {
            return response()->json([
                'message'          => 'Some selected dates are no longer available. Please remove them and try again.',
                'unavailable_ids'  => $unavailableIds,
            ], 422);
        }

        DB::transaction(function () use ($cartItems) {
            foreach ($cartItems as $item) {
                $dateStr = $item->selected_date->format('Y-m-d');

                ServiceAvailability::where('service_profile_id', $item->service_profile_id)
                    ->where('available_date', $dateStr)
                    ->delete();

                $item->update(['status' => 'pending']);
            }
        });

        return response()->json([
            'message'       => 'Booking request submitted! Vendors will be notified.',
            'booking_count' => $cartItems->count(),
        ]);
    }

    // GET /bookings — customer booking history
    public function myBookings(Request $request)
    {
        $userId = $request->user()->id;

        $bookings = Booking::query()
            ->where('bookings.user_id', $userId)
            ->whereIn('bookings.status', ['pending', 'confirmed', 'cancelled'])
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
                    'price'         => 'RM ' . number_format($item->pricing_starting_from, 2),
                    'price_value'   => (float) $item->pricing_starting_from,
                    'pricing_unit'  => $item->pricing_unit,
                    'selected_date' => $item->selected_date->format('Y-m-d'),
                    'status'        => $item->status,
                    'booked_at'     => $item->created_at->toDateTimeString(),
                ];
            });

        return response()->json(['bookings' => $bookings]);
    }
}
