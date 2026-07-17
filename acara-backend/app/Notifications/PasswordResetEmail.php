<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetEmail extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(private readonly string $token)
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
        $resetUrl = rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        return (new MailMessage)
            ->mailer(config('acara.security_email.mailer', 'resend'))
            ->subject('Reset your ACARA password')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('We received a request to reset the password for your ACARA account.')
            ->action('Reset password', $resetUrl)
            ->line('This secure link expires in '.config('auth.passwords.users.expire', 60).' minutes and can only be used once.')
            ->line('If you did not request a password reset, you can safely ignore this email. Your password has not changed.');
    }

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [60, 300, 900];
    }
}
