<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingTrackingUpdate;
use App\Models\ServiceProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingTrackingController extends Controller
{
    /** POST /vendor/bookings/{id}/tracking-stage */
    public function store(Request $request, int $id)
    {
        $validated = $request->validate([
            'stage' => ['required', 'string', 'in:'.implode(',', BookingTrackingUpdate::STAGES)],
            'note' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['required_if:stage,arrived', 'numeric', 'between:-90,90'],
            'longitude' => ['required_if:stage,arrived', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
            'photo' => ['required_if:stage,arrived', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $serviceIds = ServiceProfile::where('user_id', $request->user()->id)->pluck('id');
        $stageIndex = array_search($validated['stage'], BookingTrackingUpdate::STAGES, true);

        $result = DB::transaction(function () use ($request, $id, $validated, $serviceIds, $stageIndex) {
            $photo = $request->file('photo');
            $booking = Booking::whereIn('service_profile_id', $serviceIds)
                ->where('id', $id)
                ->where('status', 'confirmed')
                ->whereNull('completion_status')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return 'not_eligible';
            }

            $latest = BookingTrackingUpdate::where('booking_id', $booking->id)
                ->lockForUpdate()
                ->latest('id')
                ->first();

            $latestIndex = $latest ? array_search($latest->stage, BookingTrackingUpdate::STAGES, true) : -1;

            if ($stageIndex <= $latestIndex) {
                return 'not_forward';
            }

            if (in_array($validated['stage'], ['on_the_way', 'arrived'], true) && $booking->selected_date->gt(today())) {
                return 'too_early';
            }

            $update = BookingTrackingUpdate::create([
                'booking_id' => $booking->id,
                'stage' => $validated['stage'],
                'note' => isset($validated['note']) && trim($validated['note']) !== ''
                    ? trim($validated['note'])
                    : null,
                'created_by' => $request->user()->id,
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'location_accuracy' => $validated['accuracy'] ?? null,
                'photo_path' => $photo?->store('booking-tracking-proofs', 'public'),
                'photo_original_name' => $photo?->getClientOriginalName(),
            ]);

            return $update;
        });

        if ($result === 'not_eligible') {
            return response()->json(['message' => 'Booking not found or not eligible for a tracking update.'], 404);
        }

        if ($result === 'not_forward') {
            return response()->json(['message' => 'Tracking stage must move forward from the current stage.'], 409);
        }

        if ($result === 'too_early') {
            return response()->json(['message' => 'This stage is only available on or after the event date.'], 422);
        }

        return response()->json([
            'message' => 'Tracking stage updated.',
            'tracking_update' => $result->toApiArray(),
            'tracking_updates' => $result->booking->trackingUpdates->map(fn ($t) => $t->toApiArray())->values(),
        ], 201);
    }
}
