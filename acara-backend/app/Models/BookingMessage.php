<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingMessage extends Model
{
    protected $fillable = [
        'booking_id',
        'sender_id',
        'message',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(int $viewerId): array
    {
        return [
            'id' => $this->id,
            'booking_id' => $this->booking_id,
            'message' => $this->message,
            'sender' => [
                'id' => $this->sender_id,
                'name' => $this->sender->name,
                'role' => $this->sender->role,
            ],
            'is_mine' => $this->sender_id === $viewerId,
            'read_at' => $this->read_at?->toDateTimeString(),
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
