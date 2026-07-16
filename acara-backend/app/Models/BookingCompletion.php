<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingCompletion extends Model
{
    protected $fillable = [
        'booking_id',
        'submitted_by',
        'status',
        'completion_note',
        'proof_path',
        'proof_original_name',
        'response_due_at',
        'reminder_sent_at',
        'submitted_at',
        'confirmed_at',
        'disputed_at',
        'dispute_reason',
        'resolved_by',
        'resolution',
        'resolution_note',
        'resolved_at',
    ];

    protected $casts = [
        'response_due_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'submitted_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'disputed_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'completion_note' => $this->completion_note,
            'proof_url' => $this->proof_path ? asset('storage/'.ltrim($this->proof_path, '/')) : null,
            'proof_name' => $this->proof_original_name,
            'response_due_at' => $this->response_due_at?->toDateTimeString(),
            'reminder_sent_at' => $this->reminder_sent_at?->toDateTimeString(),
            'submitted_at' => $this->submitted_at?->toDateTimeString(),
            'confirmed_at' => $this->confirmed_at?->toDateTimeString(),
            'disputed_at' => $this->disputed_at?->toDateTimeString(),
            'dispute_reason' => $this->dispute_reason,
            'resolution' => $this->resolution,
            'resolution_note' => $this->resolution_note,
            'resolved_at' => $this->resolved_at?->toDateTimeString(),
        ];
    }
}
