<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $fillable = [
        'booking_id',
        'created_by',
        'version',
        'status',
        'currency',
        'subtotal',
        'discount_amount',
        'tax_rate',
        'tax_amount',
        'total_amount',
        'terms',
        'vendor_notes',
        'valid_until',
        'sent_at',
        'responded_at',
        'expired_at',
        'response_note',
    ];

    protected $casts = [
        'version' => 'integer',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'valid_until' => 'datetime',
        'sent_at' => 'datetime',
        'responded_at' => 'datetime',
        'expired_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class)->orderBy('sort_order')->orderBy('id');
    }

    public function reference(): string
    {
        return 'Q-ACR'.str_pad((string) $this->booking_id, 6, '0', STR_PAD_LEFT).'-V'.$this->version;
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        $this->loadMissing('items');

        return [
            'id' => $this->id,
            'reference' => $this->reference(),
            'version' => $this->version,
            'status' => $this->status,
            'currency' => $this->currency,
            'subtotal' => (float) $this->subtotal,
            'discount_amount' => (float) $this->discount_amount,
            'tax_rate' => (float) $this->tax_rate,
            'tax_amount' => (float) $this->tax_amount,
            'total_amount' => (float) $this->total_amount,
            'terms' => $this->terms,
            'vendor_notes' => $this->vendor_notes,
            'valid_until' => $this->valid_until?->toDateTimeString(),
            'sent_at' => $this->sent_at?->toDateTimeString(),
            'responded_at' => $this->responded_at?->toDateTimeString(),
            'expired_at' => $this->expired_at?->toDateTimeString(),
            'response_note' => $this->response_note,
            'items' => $this->items->map(fn (QuotationItem $item) => $item->toApiArray())->values(),
        ];
    }
}
