<?php

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Collection;

class PlatformSettingService
{
    public const BOOKING_RESPONSE_HOURS = 'booking_response_hours';

    public const BOOKING_REMINDER_HOURS = 'booking_reminder_hours';

    public const COMPLETION_RESPONSE_HOURS = 'completion_response_hours';

    public const COMPLETION_REMINDER_HOURS = 'completion_reminder_hours';

    public const BOOKING_EMAIL_ENABLED = 'booking_email_enabled';

    /** @var Collection<string, PlatformSetting>|null */
    private ?Collection $records = null;

    /**
     * @return array<string, int|bool>
     */
    public function defaults(): array
    {
        return [
            self::BOOKING_RESPONSE_HOURS => max(1, (int) config('acara.booking_lifecycle.response_hours', 48)),
            self::BOOKING_REMINDER_HOURS => max(1, (int) config('acara.booking_lifecycle.reminder_hours_before_expiry', 12)),
            self::COMPLETION_RESPONSE_HOURS => max(1, (int) config('acara.booking_completion.response_hours', 72)),
            self::COMPLETION_REMINDER_HOURS => max(1, (int) config('acara.booking_completion.reminder_hours_before_expiry', 24)),
            self::BOOKING_EMAIL_ENABLED => (bool) config('acara.booking_email.enabled', false),
        ];
    }

    /**
     * @return array<string, int|bool>
     */
    public function values(): array
    {
        $values = $this->defaults();

        foreach ($this->settingRecords() as $key => $record) {
            if (array_key_exists($key, $values)) {
                $values[$key] = $this->normalize($key, $record->value);
            }
        }

        return $values;
    }

    public function bookingResponseHours(): int
    {
        return (int) $this->values()[self::BOOKING_RESPONSE_HOURS];
    }

    public function bookingReminderHours(): int
    {
        return (int) $this->values()[self::BOOKING_REMINDER_HOURS];
    }

    public function completionResponseHours(): int
    {
        return (int) $this->values()[self::COMPLETION_RESPONSE_HOURS];
    }

    public function completionReminderHours(): int
    {
        return (int) $this->values()[self::COMPLETION_REMINDER_HOURS];
    }

    public function bookingEmailsEnabled(): bool
    {
        return (bool) $this->values()[self::BOOKING_EMAIL_ENABLED];
    }

    /**
     * @param  array<string, int|bool>  $values
     * @return array<int, string>
     */
    public function updateValues(array $values, int $adminId): array
    {
        $current = $this->values();
        $changed = [];

        foreach ($values as $key => $value) {
            if (! array_key_exists($key, $current)) {
                continue;
            }

            $normalized = $this->normalize($key, $value);
            if ($current[$key] === $normalized) {
                continue;
            }

            PlatformSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $normalized, 'updated_by' => $adminId],
            );
            $changed[] = $key;
        }

        $this->records = null;

        return $changed;
    }

    /**
     * @return array<string, array{source: string, updated_at: string|null, updated_by: array{id: int, name: string, email: string}|null}>
     */
    public function metadata(): array
    {
        $metadata = [];

        foreach (array_keys($this->defaults()) as $key) {
            $record = $this->settingRecords()->get($key);
            $metadata[$key] = [
                'source' => $record ? 'admin_override' : 'environment_default',
                'updated_at' => $record?->updated_at?->toDateTimeString(),
                'updated_by' => $record?->updatedBy ? [
                    'id' => $record->updatedBy->id,
                    'name' => $record->updatedBy->name,
                    'email' => $record->updatedBy->email,
                ] : null,
            ];
        }

        return $metadata;
    }

    /**
     * @return Collection<string, PlatformSetting>
     */
    private function settingRecords(): Collection
    {
        return $this->records ??= PlatformSetting::query()
            ->with('updatedBy:id,name,email')
            ->whereIn('key', array_keys($this->defaults()))
            ->get()
            ->keyBy('key');
    }

    private function normalize(string $key, mixed $value): int|bool
    {
        return $key === self::BOOKING_EMAIL_ENABLED
            ? (bool) $value
            : max(1, (int) $value);
    }
}
