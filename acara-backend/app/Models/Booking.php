<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    protected $fillable = [
        'user_id',
        'service_profile_id',
        'service_name_snapshot',
        'vendor_name_snapshot',
        'price_snapshot',
        'pricing_unit_snapshot',
        'selected_date',
        'status',
        'completion_status',
        'notes',
        'rejection_reason',
        'cancellation_reason',
        'cancelled_by',
        'rejected_at',
        'cancelled_at',
        'expires_at',
        'reminder_sent_at',
        'expired_at',
        'confirmed_at',
        'completed_at',
    ];

    protected $casts = [
        'selected_date' => 'date',
        'rejected_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'expires_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'expired_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'completed_at' => 'datetime',
        'price_snapshot' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function serviceProfile(): BelongsTo
    {
        return $this->belongsTo(ServiceProfile::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public function brief(): HasOne
    {
        return $this->hasOne(BookingBrief::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class)->latest('version');
    }

    public function latestQuotation(): HasOne
    {
        return $this->hasOne(Quotation::class)->latestOfMany('version');
    }

    public function completions(): HasMany
    {
        return $this->hasMany(BookingCompletion::class)->latest('id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(BookingMessage::class);
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(BookingMessage::class)->latestOfMany();
    }

    public function latestCompletion(): HasOne
    {
        return $this->hasOne(BookingCompletion::class)->latestOfMany();
    }

    public function rescheduleRequests(): HasMany
    {
        return $this->hasMany(BookingRescheduleRequest::class)->latest('id');
    }

    public function pendingRescheduleRequest(): HasOne
    {
        return $this->hasOne(BookingRescheduleRequest::class)
            ->where('status', 'pending')
            ->latestOfMany();
    }

    /**
     * @return array<int, array{type: string, label: string, description: string, occurred_at: string}>
     */
    public function activityTimeline(): array
    {
        $events = [[
            'type' => 'submitted',
            'label' => 'Request submitted',
            'description' => 'The organizer submitted this booking request.',
            'occurred_at' => $this->created_at->toDateTimeString(),
        ]];

        $candidates = [
            ['reminder', 'Response reminder sent', 'The vendor was reminded to respond.', $this->reminder_sent_at],
            ['confirmed', 'Booking confirmed', 'The organizer accepted the vendor quotation.', $this->confirmed_at],
            ['rejected', 'Request rejected', 'The vendor declined the booking request.', $this->rejected_at],
            [
                'cancelled',
                'Booking cancelled',
                $this->cancelled_by === 'vendor'
                    ? 'The vendor cancelled the confirmed booking.'
                    : 'The organizer cancelled the booking.',
                $this->cancelled_at,
            ],
            ['expired', 'Request expired', 'The response deadline passed without a vendor decision.', $this->expired_at],
            ['completed', 'Service completed', 'The service completion was verified and the booking was closed.', $this->completed_at],
        ];

        foreach ($candidates as [$type, $label, $description, $occurredAt]) {
            if (! $occurredAt) {
                continue;
            }

            $events[] = [
                'type' => $type,
                'label' => $label,
                'description' => $description,
                'occurred_at' => $occurredAt->toDateTimeString(),
            ];
        }

        $quotations = $this->relationLoaded('quotations')
            ? $this->quotations
            : $this->quotations()->with('items')->get();

        foreach ($quotations as $quotation) {
            if ($quotation->sent_at) {
                $events[] = [
                    'type' => 'quotation_sent',
                    'label' => 'Quotation sent',
                    'description' => "The vendor sent quotation {$quotation->reference()} for RM ".number_format((float) $quotation->total_amount, 2).'.',
                    'occurred_at' => $quotation->sent_at->toDateTimeString(),
                ];
            }

            if ($quotation->status === 'accepted' && $quotation->responded_at) {
                $events[] = [
                    'type' => 'quotation_accepted',
                    'label' => 'Quotation accepted',
                    'description' => 'The organizer accepted the quotation and confirmed the booking.',
                    'occurred_at' => $quotation->responded_at->toDateTimeString(),
                ];
            }

            if ($quotation->status === 'revision_requested' && $quotation->responded_at) {
                $events[] = [
                    'type' => 'quotation_revision_requested',
                    'label' => 'Quotation revision requested',
                    'description' => 'The organizer requested a revised quotation. Reason: '.$quotation->response_note,
                    'occurred_at' => $quotation->responded_at->toDateTimeString(),
                ];
            }

            if ($quotation->status === 'declined' && $quotation->responded_at) {
                $events[] = [
                    'type' => 'quotation_declined',
                    'label' => 'Quotation declined',
                    'description' => 'The organizer declined the quotation. Reason: '.$quotation->response_note,
                    'occurred_at' => $quotation->responded_at->toDateTimeString(),
                ];
            }

            if ($quotation->status === 'expired' && $quotation->expired_at) {
                $events[] = [
                    'type' => 'quotation_expired',
                    'label' => 'Quotation expired',
                    'description' => 'The quotation validity period ended without an organizer response.',
                    'occurred_at' => $quotation->expired_at->toDateTimeString(),
                ];
            }
        }

        $completions = $this->relationLoaded('completions')
            ? $this->completions
            : $this->completions()->get();

        foreach ($completions as $completion) {
            $events[] = [
                'type' => 'completion_submitted',
                'label' => 'Completion submitted',
                'description' => 'The vendor submitted service completion for organizer verification.',
                'occurred_at' => $completion->submitted_at->toDateTimeString(),
            ];

            if (in_array($completion->status, ['confirmed', 'auto_confirmed'], true) && $completion->confirmed_at) {
                $events[] = [
                    'type' => $completion->status === 'auto_confirmed' ? 'completion_auto_confirmed' : 'completion_confirmed',
                    'label' => $completion->status === 'auto_confirmed' ? 'Completion confirmed automatically' : 'Completion confirmed',
                    'description' => $completion->status === 'auto_confirmed'
                        ? 'The organizer response period ended without an issue being reported.'
                        : 'The organizer verified that the service was completed.',
                    'occurred_at' => $completion->confirmed_at->toDateTimeString(),
                ];
            }

            if ($completion->disputed_at) {
                $events[] = [
                    'type' => 'completion_disputed',
                    'label' => 'Completion issue reported',
                    'description' => 'The organizer requested an administrator review. Reason: '.$completion->dispute_reason,
                    'occurred_at' => $completion->disputed_at->toDateTimeString(),
                ];
            }

            if ($completion->resolved_at) {
                $events[] = [
                    'type' => $completion->resolution === 'complete' ? 'completion_resolved_completed' : 'completion_resolved_reopened',
                    'label' => $completion->resolution === 'complete' ? 'Completion approved by admin' : 'Completion returned to vendor',
                    'description' => 'Administrator resolution: '.$completion->resolution_note,
                    'occurred_at' => $completion->resolved_at->toDateTimeString(),
                ];
            }
        }

        $rescheduleRequests = $this->relationLoaded('rescheduleRequests')
            ? $this->rescheduleRequests
            : $this->rescheduleRequests()->get();

        foreach ($rescheduleRequests as $request) {
            $originalDate = $request->original_date->format('j M Y');
            $requestedDate = $request->requested_date->format('j M Y');

            $events[] = [
                'type' => 'reschedule_requested',
                'label' => 'Date change requested',
                'description' => "The organizer requested changing the event from {$originalDate} to {$requestedDate}. Reason: {$request->reason}",
                'occurred_at' => $request->created_at->toDateTimeString(),
            ];

            if ($request->status === 'approved' && $request->decided_at) {
                $events[] = [
                    'type' => 'reschedule_approved',
                    'label' => 'Date change approved',
                    'description' => "The vendor approved the new event date, {$requestedDate}.",
                    'occurred_at' => $request->decided_at->toDateTimeString(),
                ];
            }

            if ($request->status === 'rejected' && $request->decided_at) {
                $events[] = [
                    'type' => 'reschedule_rejected',
                    'label' => 'Date change declined',
                    'description' => "The original event date, {$originalDate}, remains confirmed. Reason: {$request->decision_reason}",
                    'occurred_at' => $request->decided_at->toDateTimeString(),
                ];
            }

            if ($request->status === 'withdrawn' && $request->withdrawn_at) {
                $events[] = [
                    'type' => 'reschedule_withdrawn',
                    'label' => 'Date change withdrawn',
                    'description' => "The request for {$requestedDate} was withdrawn.",
                    'occurred_at' => $request->withdrawn_at->toDateTimeString(),
                ];
            }
        }

        usort($events, fn (array $first, array $second) => strcmp($first['occurred_at'], $second['occurred_at']));

        return $events;
    }
}
