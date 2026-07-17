<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordChangedEmail extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct()
    {
        $this->afterCommit();
        $this->onConnection(config('acara.security_email.queue_connection', 'database'));
        $this->onQueue(config('acara.security_email.queue', 'emails'));
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
        return (new MailMessage)
            ->mailer(config('acara.security_email.mailer', 'resend'))
            ->subject('Your ACARA password was changed')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('The password for your ACARA account was changed successfully.')
            ->line('For your security, all existing sessions have been signed out.')
            ->action('Sign in to ACARA', rtrim(config('app.frontend_url'), '/').'/login')
            ->line('If you did not make this change, contact an ACARA administrator immediately.');
    }

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [60, 300, 900];
    }
}
