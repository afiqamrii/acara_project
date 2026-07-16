<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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

        usort($events, fn (array $first, array $second) => strcmp($first['occurred_at'], $second['occurred_at']));

        return $events;
    }
}
