<?php

namespace App\Notifications;

use App\Support\AcaraEmailBranding;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

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

        $message = (new MailMessage)
            ->subject('Welcome to Acara! Verify your email')
            ->greeting('Hello, '.$notifiable->name.'!');

        return AcaraEmailBranding::addLogo($message)
            ->line('We are excited to have you on board. Please verify your email address to get access to all features.')
            ->action('Verify Email Address', $verificationUrl)
            ->line('This link will expire in 60 minutes.')
            ->line('If you did not create an account, no further action is required.');
    }
}
