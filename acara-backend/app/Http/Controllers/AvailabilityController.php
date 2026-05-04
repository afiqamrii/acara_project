<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    /** Public: available dates for a specific service (today onwards). */
    public function publicAvailability(int $serviceId)
    {
        $dates = ServiceAvailability::where('service_profile_id', $serviceId)
            ->where('available_date', '>=', today())
            ->orderBy('available_date')
            ->pluck('available_date')
            ->map(fn ($d) => $d->toDateString())
            ->values();

        return response()->json(['dates' => $dates]);
    }

    /** Vendor: list all their registered services. */
    public function vendorServices(Request $request)
    {
        $storageUrl = rtrim(asset('storage'), '/');

        $services = ServiceProfile::where('user_id', $request->user()->id)
            ->orderBy('created_at')
            ->get([
                'id', 'service_name', 'service_category', 'status',
                'service_details', 'pricing_starting_from', 'pricing_unit', 'pricing_description',
                'portfolio_path',
            ])
            ->map(fn ($s) => array_merge($s->toArray(), [
                'portfolio_url' => $s->portfolio_path
                    ? $storageUrl . '/' . ltrim($s->portfolio_path, '/')
                    : null,
            ]));

        if ($services->isEmpty()) {
            return response()->json(['message' => 'No services registered.'], 404);
        }

        return response()->json(['services' => $services->values()]);
    }

    /** Vendor: fetch availability for one of their services. */
    public function vendorAvailability(Request $request, int $serviceId)
    {
        $service = ServiceProfile::where('id', $serviceId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $service) {
            return response()->json(['message' => 'Service not found.'], 404);
        }

        $dates = ServiceAvailability::where('service_profile_id', $service->id)
            ->where('available_date', '>=', today())
            ->orderBy('available_date')
            ->pluck('available_date')
            ->map(fn ($d) => $d->toDateString())
            ->values();

        $bookedDates = Booking::where('bookings.service_profile_id', $service->id)
            ->whereIn('bookings.status', ['pending', 'confirmed'])
            ->where('bookings.selected_date', '>=', today())
            ->join('users', 'users.id', '=', 'bookings.user_id')
            ->orderBy('bookings.selected_date')
            ->select('bookings.selected_date', 'users.name as customer_name')
            ->get()
            ->groupBy(fn ($b) => $b->selected_date->toDateString())
            ->map(fn ($group, $date) => [
                'date'      => $date,
                'customers' => $group
                    ->map(fn ($b) => explode(' ', trim($b->customer_name))[0])
                    ->unique()
                    ->values(),
            ])
            ->values();

        return response()->json([
            'service_id'   => $service->id,
            'service_name' => $service->service_name,
            'dates'        => $dates,
            'booked_dates' => $bookedDates,
        ]);
    }

    /** Vendor: replace all future availability for one of their services. */
    public function sync(Request $request, int $serviceId)
    {
        $validated = $request->validate([
            'dates'   => ['required', 'array'],
            'dates.*' => ['date_format:Y-m-d', 'after_or_equal:today'],
        ]);

        $service = ServiceProfile::where('id', $serviceId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $service) {
            return response()->json(['message' => 'Service not found.'], 404);
        }

        $dates = collect($validated['dates'])->unique()->values();

        ServiceAvailability::where('service_profile_id', $service->id)
            ->where('available_date', '>=', today())
            ->delete();

        if ($dates->isNotEmpty()) {
            $now     = now();
            $inserts = $dates->map(fn ($d) => [
                'service_profile_id' => $service->id,
                'available_date'     => $d,
                'created_at'         => $now,
                'updated_at'         => $now,
            ])->all();

            ServiceAvailability::insert($inserts);
        }

        return response()->json([
            'message' => 'Availability updated.',
            'dates'   => $dates->values(),
        ]);
    }

    /** Vendor: re-open a booked date to accept additional customers. */
    public function reopenDate(Request $request, int $serviceId)
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
        ]);

        $service = ServiceProfile::where('id', $serviceId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $service) {
            return response()->json(['message' => 'Service not found.'], 404);
        }

        $hasBooking = Booking::where('service_profile_id', $service->id)
            ->where('selected_date', $validated['date'])
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        if (! $hasBooking) {
            return response()->json(['message' => 'No active booking found for this date.'], 422);
        }

        ServiceAvailability::firstOrCreate(
            ['service_profile_id' => $service->id, 'available_date' => $validated['date']]
        );

        return response()->json(['message' => 'Date re-opened for additional bookings.']);
    }
}
