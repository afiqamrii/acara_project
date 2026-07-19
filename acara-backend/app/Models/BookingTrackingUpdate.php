<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingTrackingUpdate extends Model
{
    public const UPDATED_AT = null;

    public const STAGES = ['vendor_preparing', 'ready_for_event', 'on_the_way', 'arrived'];

    public const STAGE_LABELS = [
        'vendor_preparing' => 'Vendor Preparing',
        'ready_for_event' => 'Ready for Event',
        'on_the_way' => 'On the Way / Setup Started',
        'arrived' => 'Arrived / Service Started',
    ];

    protected $fillable = [
        'booking_id',
        'stage',
        'note',
        'created_by',
        'latitude',
        'longitude',
        'location_accuracy',
        'photo_path',
        'photo_original_name',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'location_accuracy' => 'float',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'stage' => $this->stage,
            'label' => self::STAGE_LABELS[$this->stage] ?? $this->stage,
            'note' => $this->note,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'location_accuracy' => $this->location_accuracy,
            'photo_url' => $this->photo_path ? asset('storage/'.ltrim($this->photo_path, '/')) : null,
            'photo_name' => $this->photo_original_name,
            'actor' => $this->actor ? [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
                'role' => $this->actor->role,
            ] : null,
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
