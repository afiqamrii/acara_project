<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingCompletion;
use App\Models\Quotation;
use Illuminate\Support\Facades\DB;

class BookingLifecycleService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * @return array{expired: int, reminded: int, completions_auto_confirmed: int, completion_reminders: int}
     */
    public function process(): array
    {
        return [
            'expired' => $this->expireDueRequests(),
            'reminded' => $this->sendDueReminders(),
            'completions_auto_confirmed' => $this->autoConfirmDueCompletions(),
            'completion_reminders' => $this->sendCompletionReminders(),
        ];
    }

    public function autoConfirmDueCompletions(): int
    {
        $confirmed = 0;

        BookingCompletion::query()
            ->where('status', 'pending')
            ->where('response_due_at', '<=', now())
            ->orderBy('id')
            ->pluck('id')
            ->each(function (int $completionId) use (&$confirmed): void {
                $didConfirm = DB::transaction(function () use ($completionId): bool {
                    $completion = BookingCompletion::query()->lockForUpdate()->find($completionId);

                    if (! $completion
                        || $completion->status !== 'pending'
                        || $completion->response_due_at->isFuture()) {
                        return false;
                    }

                    $booking = Booking::query()->lockForUpdate()->find($completion->booking_id);
                    if (! $booking
                        || $booking->status !== 'confirmed'
                        || $booking->completion_status !== 'completion_pending') {
                        return false;
                    }

                    $completion->update([
                        'status' => 'auto_confirmed',
                        'confirmed_at' => now(),
                    ]);
                    $booking->update([
                        'status' => 'completed',
                        'completion_status' => null,
                        'completed_at' => now(),
                    ]);
                    $this->notifications->completionAutoConfirmed($booking, $completion);

                    return true;
                });

                if ($didConfirm) {
                    $confirmed++;
                }
            });

        return $confirmed;
    }

    public function sendCompletionReminders(): int
    {
        $reminded = 0;
        $reminderHours = max(1, (int) config('acara.booking_completion.reminder_hours_before_expiry', 24));
        $reminderThreshold = now()->addHours($reminderHours);

        BookingCompletion::query()
            ->where('status', 'pending')
            ->whereNull('reminder_sent_at')
            ->where('response_due_at', '>', now())
            ->where('response_due_at', '<=', $reminderThreshold)
            ->orderBy('id')
            ->pluck('id')
            ->each(function (int $completionId) use (&$reminded): void {
                $didRemind = DB::transaction(function () use ($completionId): bool {
                    $completion = BookingCompletion::query()->lockForUpdate()->find($completionId);

                    if (! $completion
                        || $completion->status !== 'pending'
                        || $completion->reminder_sent_at
                        || $completion->response_due_at->isPast()) {
                        return false;
                    }

                    $booking = Booking::query()->lockForUpdate()->find($completion->booking_id);
                    if (! $booking
                        || $booking->status !== 'confirmed'
                        || $booking->completion_status !== 'completion_pending') {
                        return false;
                    }

                    $completion->update(['reminder_sent_at' => now()]);
                    $this->notifications->completionReminder($booking, $completion);

                    return true;
                });

                if ($didRemind) {
                    $reminded++;
                }
            });

        return $reminded;
    }

    public function expireDueRequests(): int
    {
        $expired = 0;

        Booking::query()
            ->where('status', 'pending')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->pluck('id')
            ->each(function (int $bookingId) use (&$expired): void {
                $didExpire = DB::transaction(function () use ($bookingId): bool {
                    $booking = Booking::query()->lockForUpdate()->find($bookingId);

                    return $booking ? $this->expireIfOverdue($booking) : false;
                });

                if ($didExpire) {
                    $expired++;
                }
            });

        return $expired;
    }

    public function sendDueReminders(): int
    {
        $reminded = 0;
        $reminderHours = max(1, (int) config('acara.booking_lifecycle.reminder_hours_before_expiry', 12));
        $reminderThreshold = now()->addHours($reminderHours);

        Booking::query()
            ->where('status', 'pending')
            ->whereNull('reminder_sent_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', $reminderThreshold)
            ->orderBy('id')
            ->pluck('id')
            ->each(function (int $bookingId) use (&$reminded): void {
                $didRemind = DB::transaction(function () use ($bookingId): bool {
                    $booking = Booking::query()->lockForUpdate()->find($bookingId);

                    if (! $booking
                        || $booking->status !== 'pending'
                        || $booking->reminder_sent_at
                        || ! $booking->expires_at
                        || $booking->expires_at->isPast()) {
                        return false;
                    }

                    $booking->update(['reminder_sent_at' => now()]);
                    $quotation = Quotation::where('booking_id', $booking->id)
                        ->where('status', 'sent')
                        ->latest('version')
                        ->first();

                    if ($quotation) {
                        $this->notifications->quotationExpiryReminder($booking, $quotation);
                    } else {
                        $this->notifications->bookingExpiryReminder($booking);
                    }

                    return true;
                });

                if ($didRemind) {
                    $reminded++;
                }
            });

        return $reminded;
    }

    public function expireIfOverdue(Booking $booking): bool
    {
        if ($booking->status !== 'pending'
            || ! $booking->expires_at
            || $booking->expires_at->isFuture()) {
            return false;
        }

        $quotation = Quotation::where('booking_id', $booking->id)
            ->where('status', 'sent')
            ->lockForUpdate()
            ->latest('version')
            ->first();

        $booking->update([
            'status' => 'expired',
            'expired_at' => now(),
        ]);

        $this->releaseDateIfFuture($booking);
        if ($quotation) {
            $quotation->update([
                'status' => 'expired',
                'expired_at' => now(),
            ]);
            $this->notifications->quotationExpiredForOrganizer($booking, $quotation);
            $this->notifications->quotationExpiredForVendor($booking, $quotation);
        } else {
            $this->notifications->bookingExpiredForOrganizer($booking);
            $this->notifications->bookingExpiredForVendor($booking);
        }

        return true;
    }

    private function releaseDateIfFuture(Booking $booking): void
    {
        if ($booking->selected_date->lt(today())) {
            return;
        }

        DB::table('service_availabilities')->insertOrIgnore([
            'service_profile_id' => $booking->service_profile_id,
            'available_date' => $booking->selected_date->format('Y-m-d'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
