<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingBrief;
use App\Models\BookingRescheduleRequest;
use App\Models\Quotation;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use App\Services\BookingLifecycleService;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
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

    /**
     * @return array<string, array<int, string>|string>
     */
    private function briefRules(): array
    {
        return [
            'brief' => ['required', 'array'],
            'brief.event_title' => ['required', 'string', 'max:150'],
            'brief.event_type' => ['required', 'string', 'max:100'],
            'brief.venue_name' => ['required', 'string', 'max:150'],
            'brief.venue_address' => ['required', 'string', 'max:1000'],
            'brief.start_time' => ['required', 'date_format:H:i'],
            'brief.end_time' => ['nullable', 'date_format:H:i', 'after:brief.start_time'],
            'brief.guest_count' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'brief.contact_name' => ['required', 'string', 'max:150'],
            'brief.contact_phone' => ['required', 'string', 'max:30'],
            'brief.setup_time' => ['nullable', 'date_format:H:i'],
            'brief.requirements' => ['nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function briefValues(array $validated): array
    {
        $brief = $validated['brief'];

        return [
            'event_title' => trim($brief['event_title']),
            'event_type' => trim($brief['event_type']),
            'venue_name' => trim($brief['venue_name']),
            'venue_address' => trim($brief['venue_address']),
            'start_time' => $brief['start_time'],
            'end_time' => $brief['end_time'] ?? null,
            'guest_count' => $brief['guest_count'] ?? null,
            'contact_name' => trim($brief['contact_name']),
            'contact_phone' => trim($brief['contact_phone']),
            'setup_time' => $brief['setup_time'] ?? null,
            'requirements' => isset($brief['requirements']) && trim($brief['requirements']) !== ''
                ? trim($brief['requirements'])
                : null,
        ];
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
        $status = $item->completion_status ?: $item->status;

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
            'status' => $status,
            'payment_status' => in_array($status, ['confirmed', 'completion_pending', 'completion_disputed', 'completed'], true) ? 'pending' : 'unpaid',
            'booked_at' => $this->formatDateTime($item->created_at),
            'notes' => $item->notes ?? null,
            'brief' => $item->brief?->toApiArray(),
            'quotation' => $item->quotations->first()?->toApiArray(),
            'quotation_history' => $item->quotations->map(fn (Quotation $quotation) => $quotation->toApiArray())->values(),
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
            'completion' => $item->completions->first()?->toApiArray(),
            'completion_history' => $item->completions
                ->map(fn ($completion) => $completion->toApiArray())
                ->values(),
            'reschedule_request' => $item->pendingRescheduleRequest?->toApiArray(),
            'reschedule_history' => $item->rescheduleRequests
                ->map(fn (BookingRescheduleRequest $request) => $request->toApiArray())
                ->values(),
            'timeline' => $item->activityTimeline(),
        ];
    }

    private function bookingSummary($items): array
    {
        return [
            'total' => $items->count(),
            'pending' => $items->where('status', 'pending')->count(),
            'confirmed' => $items->where('status', 'confirmed')->count(),
            'completion_pending' => $items->where('status', 'completion_pending')->count(),
            'completion_disputed' => $items->where('status', 'completion_disputed')->count(),
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
            ->with('brief')
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
                'bookings.completion_status',
                'bookings.notes',
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
                    'notes' => $item->notes,
                    'brief' => $item->brief?->toApiArray(),
                ];
            });

        return response()->json(['items' => $items]);
    }

    // POST /bookings/cart
    public function addToCart(Request $request)
    {
        $validated = $request->validate(array_merge([
            'service_id' => 'required|integer|exists:service_profiles,id',
            'date' => 'required|date_format:Y-m-d|after_or_equal:today',
        ], $this->briefRules()));

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

        $booking = DB::transaction(function () use ($userId, $serviceId, $date, $validated) {
            $booking = Booking::create([
                'user_id' => $userId,
                'service_profile_id' => $serviceId,
                'selected_date' => $date,
                'status' => 'cart',
                'notes' => isset($validated['notes']) ? trim($validated['notes']) : null,
            ]);
            $booking->brief()->create($this->briefValues($validated));

            return $booking;
        });

        return response()->json([
            'message' => 'Added to cart.',
            'booking_id' => $booking->id,
        ], 201);
    }

    // PUT /bookings/cart/{id}/brief
    public function updateCartBrief(Request $request, int $id)
    {
        $validated = $request->validate($this->briefRules());

        $booking = DB::transaction(function () use ($request, $id, $validated) {
            $booking = Booking::where('id', $id)
                ->where('user_id', $request->user()->id)
                ->where('status', 'cart')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            $brief = BookingBrief::where('booking_id', $booking->id)
                ->lockForUpdate()
                ->first();

            if ($brief?->locked_at) {
                return 'locked';
            }

            $brief = BookingBrief::updateOrCreate(
                ['booking_id' => $booking->id],
                $this->briefValues($validated),
            );
            $booking->update([
                'notes' => isset($validated['notes']) && trim($validated['notes']) !== ''
                    ? trim($validated['notes'])
                    : null,
            ]);

            return $brief;
        });

        if ($booking === 'locked') {
            return response()->json(['message' => 'This booking brief is already locked.'], 409);
        }

        if (! $booking) {
            return response()->json(['message' => 'Cart item not found.'], 404);
        }

        return response()->json([
            'message' => 'Booking brief updated.',
            'brief' => $booking->toApiArray(),
        ]);
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

        $confirmationIssues = DB::transaction(function () use ($cartItems) {
            $lockedItems = [];
            $unavailableIds = [];
            $incompleteIds = [];

            foreach ($cartItems as $item) {
                $dateStr = $item->selected_date->format('Y-m-d');

                $brief = BookingBrief::where('booking_id', $item->id)
                    ->lockForUpdate()
                    ->first();

                if (! $brief || $brief->locked_at) {
                    $incompleteIds[] = $item->id;

                    continue;
                }

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

                $lockedItems[] = [$item, $availability, $brief, [
                    'service_name_snapshot' => $service->service_name,
                    'vendor_name_snapshot' => $vendorName,
                    'price_snapshot' => $service->pricing_starting_from,
                    'pricing_unit_snapshot' => $service->pricing_unit,
                ]];
            }

            if (! empty($unavailableIds) || ! empty($incompleteIds)) {
                return compact('unavailableIds', 'incompleteIds');
            }

            foreach ($lockedItems as [$item, $availability, $brief, $snapshot]) {
                $availability->delete();
                $brief->update(['locked_at' => now()]);
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

            return ['unavailableIds' => [], 'incompleteIds' => []];
        });

        if (! empty($confirmationIssues['incompleteIds'])) {
            return response()->json([
                'message' => 'Complete the event brief for every cart item before submitting.',
                'incomplete_ids' => $confirmationIssues['incompleteIds'],
                'unavailable_ids' => $confirmationIssues['unavailableIds'],
            ], 422);
        }

        if (! empty($confirmationIssues['unavailableIds'])) {
            return response()->json([
                'message' => 'Some selected dates are no longer available. Please remove them and try again.',
                'unavailable_ids' => $confirmationIssues['unavailableIds'],
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
            ->with(['brief', 'quotations.items', 'completions', 'rescheduleRequests', 'pendingRescheduleRequest'])
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
                'bookings.completion_status',
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
                ->whereNull('completion_status')
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
            Quotation::where('booking_id', $booking->id)
                ->where('status', 'sent')
                ->update([
                    'status' => 'withdrawn',
                    'responded_at' => now(),
                    'response_note' => 'The organizer cancelled the booking request.',
                    'updated_at' => now(),
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

    // GET /bookings/{id}/reschedule/availability
    public function rescheduleAvailability(Request $request, int $id)
    {
        $booking = Booking::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'confirmed')
            ->whereNull('completion_status')
            ->whereDate('selected_date', '>', today())
            ->first();

        if (! $booking) {
            return response()->json(['message' => 'This booking cannot be rescheduled.'], 404);
        }

        $dates = ServiceAvailability::where('service_profile_id', $booking->service_profile_id)
            ->whereDate('available_date', '>', today())
            ->orderBy('available_date')
            ->pluck('available_date')
            ->map(fn ($date) => $date->format('Y-m-d'))
            ->values();

        return response()->json([
            'booking_id' => $booking->id,
            'current_date' => $booking->selected_date->format('Y-m-d'),
            'dates' => $dates,
        ]);
    }

    // POST /bookings/{id}/reschedule
    public function requestReschedule(Request $request, int $id)
    {
        $validated = $request->validate([
            'requested_date' => ['required', 'date_format:Y-m-d', 'after:today'],
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $result = DB::transaction(function () use ($request, $id, $validated) {
            $booking = Booking::where('id', $id)
                ->where('user_id', $request->user()->id)
                ->where('status', 'confirmed')
                ->whereNull('completion_status')
                ->lockForUpdate()
                ->first();

            if (! $booking || $booking->selected_date->lte(today())) {
                return 'not_eligible';
            }

            if ($booking->selected_date->format('Y-m-d') === $validated['requested_date']) {
                return 'same_date';
            }

            $hasPendingRequest = BookingRescheduleRequest::where('booking_id', $booking->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->exists();

            if ($hasPendingRequest) {
                return 'already_pending';
            }

            $dateAvailable = ServiceAvailability::where('service_profile_id', $booking->service_profile_id)
                ->whereDate('available_date', $validated['requested_date'])
                ->lockForUpdate()
                ->exists();

            $duplicateForCustomer = Booking::where('user_id', $booking->user_id)
                ->where('service_profile_id', $booking->service_profile_id)
                ->whereDate('selected_date', $validated['requested_date'])
                ->where('id', '!=', $booking->id)
                ->whereIn('status', ['pending', 'confirmed', 'completed'])
                ->lockForUpdate()
                ->exists();

            if (! $dateAvailable || $duplicateForCustomer) {
                return 'unavailable';
            }

            $rescheduleRequest = BookingRescheduleRequest::create([
                'booking_id' => $booking->id,
                'requested_by' => $request->user()->id,
                'original_date' => $booking->selected_date,
                'requested_date' => $validated['requested_date'],
                'reason' => trim($validated['reason']),
                'status' => 'pending',
            ]);

            $this->notifications->rescheduleRequested($booking, $rescheduleRequest);

            return $rescheduleRequest;
        });

        if ($result === 'not_eligible') {
            return response()->json(['message' => 'Only future confirmed bookings can be rescheduled.'], 422);
        }

        if ($result === 'same_date') {
            return response()->json(['message' => 'Please choose a date different from the current event date.'], 422);
        }

        if ($result === 'already_pending') {
            return response()->json(['message' => 'This booking already has a pending date change request.'], 409);
        }

        if ($result === 'unavailable') {
            return response()->json(['message' => 'The requested date is no longer available.'], 422);
        }

        return response()->json([
            'message' => 'Date change request sent to the vendor.',
            'reschedule_request' => $result->toApiArray(),
        ], 201);
    }

    // PATCH /bookings/{id}/reschedule/withdraw
    public function withdrawReschedule(Request $request, int $id)
    {
        $result = DB::transaction(function () use ($request, $id) {
            $booking = Booking::where('id', $id)
                ->where('user_id', $request->user()->id)
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
                'status' => 'withdrawn',
                'withdrawn_at' => now(),
            ]);
            $this->notifications->rescheduleWithdrawn($booking, $rescheduleRequest);

            return $rescheduleRequest;
        });

        if (! $result) {
            return response()->json(['message' => 'No pending date change request was found.'], 404);
        }

        return response()->json(['message' => 'Date change request withdrawn.']);
    }

    private function adminBookingsQuery(): Builder
    {
        return Booking::query()
            ->with(['brief', 'quotations.items', 'completions', 'rescheduleRequests', 'pendingRescheduleRequest'])
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
                'bookings.completion_status',
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
            ]);
    }

    // GET /admin/bookings - admin monitor
    public function adminBookings()
    {
        $bookings = $this->adminBookingsQuery()
            ->orderByRaw("CASE bookings.completion_status WHEN 'completion_disputed' THEN 0 WHEN 'completion_pending' THEN 1 ELSE CASE bookings.status WHEN 'pending' THEN 2 WHEN 'confirmed' THEN 3 WHEN 'completed' THEN 4 WHEN 'expired' THEN 5 WHEN 'rejected' THEN 6 ELSE 7 END END")
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

    // GET /admin/bookings/{id} - complete admin audit record
    public function adminBooking(int $id)
    {
        $item = $this->adminBookingsQuery()
            ->where('bookings.id', $id)
            ->first();

        if (! $item) {
            return response()->json(['message' => 'Booking record not found.'], 404);
        }

        return response()->json([
            'booking' => array_merge($this->mapCustomerBooking($item), [
                'customer_name' => $item->customer_name,
                'customer_email' => $item->customer_email,
            ]),
        ]);
    }
}
