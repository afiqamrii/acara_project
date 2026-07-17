<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, Prunable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone_number',
        'avatar_path',
        'status',
        'last_login_at',
        'suspended_at',
        'suspension_reason',
        'suspended_by',
        'profile_completed',
        'invited_by',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'suspended_at' => 'datetime',
        'profile_completed' => 'boolean',
        'password' => 'hashed',
    ];

    /**
     * Send the email verification notification.
     *
     * @param  string  $token
     * @return void
     */
    public function sendEmailVerificationNotification()
    {
        $this->notify(new \App\Notifications\CustomVerifyEmail);
    }

    /**
     * Get the prunable model query.
     */
    public function prunable()
    {
        // Auto-delete users who have NOT verified their email AND created the account more than 30 days ago.
        return static::whereNull('email_verified_at')
            ->where('created_at', '<=', now()->subDays(30));
    }

    /**
     * Get the service profile associated with the user.
     */
    public function serviceProfile()
    {
        return $this->hasOne(ServiceProfile::class);
    }

    public function serviceProfiles(): HasMany
    {
        return $this->hasMany(ServiceProfile::class);
    }

    /**
     * Get the vendor profile associated with the user.
     */
    public function vendorProfile()
    {
        return $this->hasOne(VendorProfile::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function receivedBookings(): HasManyThrough
    {
        return $this->hasManyThrough(Booking::class, ServiceProfile::class);
    }

    public function bookingMessages()
    {
        return $this->hasMany(BookingMessage::class, 'sender_id');
    }

    public function notificationPreference(): HasOne
    {
        return $this->hasOne(UserNotificationPreference::class);
    }

    public function moderationActions(): HasMany
    {
        return $this->hasMany(UserModerationAction::class, 'target_user_id')->latest();
    }

    public function moderationActionsPerformed(): HasMany
    {
        return $this->hasMany(UserModerationAction::class, 'admin_id');
    }

    public function suspendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suspended_by');
    }
}
