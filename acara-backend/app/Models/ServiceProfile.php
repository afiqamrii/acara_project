<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceProfile extends Model
{
    use HasFactory;

    protected $table = 'service_profiles';

    protected $fillable = [
        'user_id',
        'service_name',
        'service_category',
        'service_details',
        'pricing_starting_from',
        'pricing_unit',
        'pricing_description',
        'portfolio_path',
        'status',
        'is_active',
        'rejection_reason',
        'rejected_at',
        'resubmitted_at',
    ];

    protected $casts = [
        'pricing_starting_from' => 'decimal:2',
        'is_active' => 'boolean',
        'rejected_at' => 'datetime',
        'resubmitted_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function availabilities(): HasMany
    {
        return $this->hasMany(ServiceAvailability::class);
    }
}
