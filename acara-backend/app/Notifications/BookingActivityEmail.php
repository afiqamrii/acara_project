<?php

namespace App\Notifications;

use App\Models\UserNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BookingActivityEmail extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public UserNotification $activity)
    {
        $this->afterCommit();
        $this->onConnection(config('acara.booking_email.queue_connection', 'database'));
        $this->onQueue(config('acara.booking_email.queue', 'emails'));
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->mailer(config('acara.booking_email.mailer', 'resend'))
            ->subject(config('app.name').': '.$this->activity->title)
            ->greeting('Hello '.$notifiable->name.',')
            ->line($this->activity->message);

        if ($bookingReference = data_get($this->activity->data, 'booking_reference')) {
            $message->line('Booking reference: '.$bookingReference);
        }

        if ($this->activity->action_url) {
            $message->action(
                $this->actionLabel(),
                rtrim(config('app.frontend_url'), '/').$this->activity->action_url,
            );
        }

        return $message->line('You can also view this update in your Acara notification centre.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'user_notification_id' => $this->activity->id,
            'booking_id' => $this->activity->booking_id,
            'type' => $this->activity->type,
        ];
    }

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [60, 300, 900];
    }

    private function actionLabel(): string
    {
        return match ($this->activity->type) {
            'review_received' => 'View review',
            'service_approved', 'service_rejected' => 'Manage service',
            default => 'View booking',
        };
    }
}
