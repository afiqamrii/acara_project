<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingCompletion;
use App\Models\BookingRescheduleRequest;
use App\Models\ServiceProfile;
use App\Services\AdminAuditService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingCompletionController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly AdminAuditService $audits,
    ) {}

    /** POST /vendor/bookings/{id}/completion */
    public function store(Request $request, int $id)
    {
        $validated = $request->validate([
            'note' => ['required', 'string', 'min:10', 'max:2000'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $serviceIds = ServiceProfile::where('user_id', $request->user()->id)->pluck('id');

        $result = DB::transaction(function () use ($request, $id, $validated, $serviceIds) {
            $booking = Booking::whereIn('service_profile_id', $serviceIds)
                ->where('id', $id)
                ->where('status', 'confirmed')
                ->whereNull('completion_status')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return 'not_eligible';
            }

            if ($booking->selected_date->gt(today())) {
                return 'too_early';
            }

            if (BookingRescheduleRequest::where('booking_id', $booking->id)
                ->where('status', 'pending')
                ->exists()) {
                return 'reschedule_pending';
            }

            if (BookingCompletion::where('booking_id', $booking->id)
                ->whereIn('status', ['pending', 'disputed'])
                ->exists()) {
                return 'already_pending';
            }

            $proof = $request->file('proof');
            $completion = BookingCompletion::create([
                'booking_id' => $booking->id,
                'submitted_by' => $request->user()->id,
                'status' => 'pending',
                'completion_note' => trim($validated['note']),
                'proof_path' => $proof?->store('booking-completion-proofs', 'public'),
                'proof_original_name' => $proof?->getClientOriginalName(),
                'response_due_at' => now()->addHours(max(1, (int) config('acara.booking_completion.response_hours', 72))),
                'submitted_at' => now(),
            ]);

            $booking->update(['completion_status' => 'completion_pending']);
            $this->notifications->completionSubmitted($booking, $completion);

            return $completion;
        });

        if ($result === 'too_early') {
            return response()->json([
                'message' => 'Completion can only be submitted on or after the event date.',
            ], 422);
        }

        if ($result === 'reschedule_pending') {
            return response()->json([
                'message' => 'Resolve the pending date change request before submitting completion.',
            ], 409);
        }

        if ($result === 'already_pending') {
            return response()->json([
                'message' => 'This booking already has a completion awaiting action.',
            ], 409);
        }

        if ($result === 'not_eligible') {
            return response()->json(['message' => 'Booking not found or not eligible for completion.'], 404);
        }

        return response()->json([
            'message' => 'Completion submitted for organizer confirmation.',
            'status' => 'completion_pending',
            'completion' => $result->toApiArray(),
        ], 201);
    }

    /** PATCH /bookings/{id}/completion/confirm */
    public function confirm(Request $request, int $id)
    {
        $result = DB::transaction(function () use ($request, $id) {
            $booking = Booking::where('id', $id)
                ->where('user_id', $request->user()->id)
                ->where('status', 'confirmed')
                ->where('completion_status', 'completion_pending')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            $completion = BookingCompletion::where('booking_id', $booking->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if (! $completion) {
                return null;
            }

            $completion->update([
                'status' => 'confirmed',
                'confirmed_at' => now(),
            ]);
            $booking->update([
                'status' => 'completed',
                'completion_status' => null,
                'completed_at' => now(),
            ]);
            $this->notifications->completionConfirmed($booking, $completion);

            return $completion;
        });

        if (! $result) {
            return response()->json(['message' => 'No completion is awaiting your confirmation.'], 404);
        }

        return response()->json([
            'message' => 'Completion confirmed. The booking is now completed.',
            'status' => 'completed',
            'completion' => $result->toApiArray(),
        ]);
    }

    /** PATCH /bookings/{id}/completion/dispute */
    public function dispute(Request $request, int $id)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $result = DB::transaction(function () use ($request, $id, $validated) {
            $booking = Booking::where('id', $id)
                ->where('user_id', $request->user()->id)
                ->where('status', 'confirmed')
                ->where('completion_status', 'completion_pending')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            $completion = BookingCompletion::where('booking_id', $booking->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if (! $completion) {
                return null;
            }

            $completion->update([
                'status' => 'disputed',
                'dispute_reason' => trim($validated['reason']),
                'disputed_at' => now(),
            ]);
            $booking->update(['completion_status' => 'completion_disputed']);
            $this->notifications->completionDisputed($booking, $completion);

            return $completion;
        });

        if (! $result) {
            return response()->json(['message' => 'No completion is available to dispute.'], 404);
        }

        return response()->json([
            'message' => 'Issue reported. An administrator will review the completion.',
            'status' => 'completion_disputed',
            'completion' => $result->toApiArray(),
        ]);
    }

    /** PATCH /admin/bookings/{id}/completion/resolve */
    public function resolve(Request $request, int $id)
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:complete,reopen'],
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $result = DB::transaction(function () use ($request, $id, $validated) {
            $booking = Booking::where('id', $id)
                ->where('status', 'confirmed')
                ->where('completion_status', 'completion_disputed')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return null;
            }

            $completion = BookingCompletion::where('booking_id', $booking->id)
                ->where('status', 'disputed')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if (! $completion) {
                return null;
            }

            $complete = $validated['decision'] === 'complete';
            $completion->update([
                'status' => $complete ? 'resolved_completed' : 'resolved_reopened',
                'resolved_by' => $request->user()->id,
                'resolution' => $validated['decision'],
                'resolution_note' => trim($validated['reason']),
                'resolved_at' => now(),
            ]);
            $booking->update([
                'status' => $complete ? 'completed' : 'confirmed',
                'completion_status' => null,
                'completed_at' => $complete ? now() : null,
            ]);
            $this->audits->record(
                request: $request,
                module: 'bookings',
                action: 'completion_resolved',
                description: $complete
                    ? 'Resolved the completion dispute and marked the booking completed.'
                    : 'Resolved the completion dispute and returned delivery to the vendor.',
                subjectLabel: $booking->service_name_snapshot ?: 'Booking '.$booking->id,
                subjectReference: 'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
                subject: $booking,
                before: [
                    'booking_status' => 'confirmed',
                    'completion_status' => 'disputed',
                ],
                after: [
                    'booking_status' => $booking->status,
                    'completion_status' => $completion->status,
                    'resolution' => $validated['decision'],
                ],
                reason: trim($validated['reason']),
                metadata: ['completion_id' => $completion->id],
            );
            $this->notifications->completionResolved($booking, $completion);

            return ['booking' => $booking, 'completion' => $completion];
        });

        if (! $result) {
            return response()->json(['message' => 'No disputed completion was found.'], 404);
        }

        return response()->json([
            'message' => $validated['decision'] === 'complete'
                ? 'Dispute resolved and booking marked as completed.'
                : 'Dispute resolved and booking returned to the vendor.',
            'status' => $result['booking']->status,
            'completion' => $result['completion']->toApiArray(),
        ]);
    }
}
