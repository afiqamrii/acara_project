<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotificationPreference extends Model
{
    public const DEFAULTS = [
        'email_enabled' => true,
        'email_booking_updates' => true,
        'email_quotation_updates' => true,
        'email_booking_messages' => true,
        'email_completion_updates' => true,
        'email_review_updates' => true,
        'email_service_updates' => true,
    ];

    protected $fillable = [
        'user_id',
        'email_enabled',
        'email_booking_updates',
        'email_quotation_updates',
        'email_booking_messages',
        'email_completion_updates',
        'email_review_updates',
        'email_service_updates',
    ];

    protected $casts = [
        'email_enabled' => 'boolean',
        'email_booking_updates' => 'boolean',
        'email_quotation_updates' => 'boolean',
        'email_booking_messages' => 'boolean',
        'email_completion_updates' => 'boolean',
        'email_review_updates' => 'boolean',
        'email_service_updates' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function allowsEmailFor(string $notificationType): bool
    {
        if (! $this->email_enabled) {
            return false;
        }

        $preference = match (true) {
            $notificationType === 'booking_message' => 'email_booking_messages',
            str_starts_with($notificationType, 'quotation_') => 'email_quotation_updates',
            str_starts_with($notificationType, 'completion_') => 'email_completion_updates',
            $notificationType === 'review_received' => 'email_review_updates',
            str_starts_with($notificationType, 'service_') => 'email_service_updates',
            str_starts_with($notificationType, 'booking_') => 'email_booking_updates',
            default => null,
        };

        return $preference === null || (bool) $this->{$preference};
    }

    /**
     * @return array<string, bool>
     */
    public function toPreferenceArray(): array
    {
        return collect(self::DEFAULTS)
            ->mapWithKeys(fn (bool $default, string $key): array => [$key => (bool) ($this->{$key} ?? $default)])
            ->all();
    }
}
