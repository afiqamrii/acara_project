<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class AdminInviteNotification extends Notification
{
    use Queueable;

    protected $password;

    /**
     * Create a new notification instance.
     *
     * @param string $password
     */
    public function __construct($password)
    {
        $this->password = $password;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        $loginUrl = env('FRONTEND_URL', 'http://localhost:5173') . '/login';

        return (new MailMessage)
            ->subject('Invitation to join Acara as Admin')
            ->greeting('Hello!')
            ->line(new HtmlString('<div style="text-align: center; margin-bottom: 20px;">
                <img src="' . env('URL_PICTURE') . '" alt="ACARA" style="max-width: 150px; height: auto;">
            </div>'))
            ->line('You have been invited to join the Acara platform as an administrator.')
            ->line('Your account has been created with a temporary password. Please log in and complete your profile.')
            ->line(new HtmlString('<strong>Temporary Password:</strong> ' . $this->password))
            ->action('Login to Acara', $loginUrl)
            ->line('After logging in, you will be prompted to complete your profile details and set a new password.')
            ->line('If you did not expect this invitation, no further action is required.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            //
        ];
    }
}
