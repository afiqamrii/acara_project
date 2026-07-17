<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingBrief extends Model
{
    protected $fillable = [
        'booking_id',
        'event_title',
        'event_type',
        'venue_name',
        'venue_address',
        'start_time',
        'end_time',
        'guest_count',
        'contact_name',
        'contact_phone',
        'setup_time',
        'requirements',
        'locked_at',
    ];

    protected $casts = [
        'guest_count' => 'integer',
        'locked_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'event_title' => $this->event_title,
            'event_type' => $this->event_type,
            'venue_name' => $this->venue_name,
            'venue_address' => $this->venue_address,
            'start_time' => $this->time($this->start_time),
            'end_time' => $this->time($this->end_time),
            'guest_count' => $this->guest_count,
            'contact_name' => $this->contact_name,
            'contact_phone' => $this->contact_phone,
            'setup_time' => $this->time($this->setup_time),
            'requirements' => $this->requirements,
            'locked_at' => $this->locked_at?->toDateTimeString(),
            'is_locked' => $this->locked_at !== null,
        ];
    }

    private function time(?string $value): ?string
    {
        return $value ? substr($value, 0, 5) : null;
    }
}
