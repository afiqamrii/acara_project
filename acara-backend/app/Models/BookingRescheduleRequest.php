<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingRescheduleRequest extends Model
{
    protected $fillable = [
        'booking_id',
        'requested_by',
        'decided_by',
        'original_date',
        'requested_date',
        'reason',
        'status',
        'decision_reason',
        'decided_at',
        'withdrawn_at',
    ];

    protected $casts = [
        'original_date' => 'date',
        'requested_date' => 'date',
        'decided_at' => 'datetime',
        'withdrawn_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'original_date' => $this->original_date->format('Y-m-d'),
            'requested_date' => $this->requested_date->format('Y-m-d'),
            'reason' => $this->reason,
            'status' => $this->status,
            'decision_reason' => $this->decision_reason,
            'requested_at' => $this->created_at?->toDateTimeString(),
            'decided_at' => $this->decided_at?->toDateTimeString(),
            'withdrawn_at' => $this->withdrawn_at?->toDateTimeString(),
        ];
    }
}
