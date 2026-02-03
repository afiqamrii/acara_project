<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\HtmlString;

class CustomVerifyEmail extends VerifyEmail
{
    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Welcome to Acara! Verify your email')
            ->greeting('Hello, ' . $notifiable->name . '!')
            ->line(new HtmlString('<div style="text-align: center; margin-bottom: 20px;">
                <img src="' . env('URL_PICTURE') . '" alt="ACARA" style="max-width: 150px; height: auto;">
            </div>'))
            ->line('We are excited to have you on board. Please verify your email address to get access to all features.')
            ->action('Verify Email Address', $verificationUrl)
            ->line('If you did not create an account, no further action is required.');
    }
}
