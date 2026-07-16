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
            ['confirmed', 'Booking confirmed', 'The vendor approved the booking request.', $this->confirmed_at],
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
            ['completed', 'Service completed', 'The vendor marked the service as completed.', $this->completed_at],
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
