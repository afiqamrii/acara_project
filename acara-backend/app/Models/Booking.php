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
    ];

    protected $casts = [
        'selected_date' => 'date',
        'rejected_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'expires_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'expired_at' => 'datetime',
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
}
