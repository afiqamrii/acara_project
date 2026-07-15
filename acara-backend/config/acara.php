<?php

return [
    'booking_email' => [
        'enabled' => env('BOOKING_EMAIL_NOTIFICATIONS_ENABLED', false),
        'mailer' => env('BOOKING_EMAIL_MAILER', 'resend'),
        'queue_connection' => env('BOOKING_EMAIL_QUEUE_CONNECTION', 'database'),
        'queue' => env('BOOKING_EMAIL_QUEUE', 'emails'),
    ],

    'booking_lifecycle' => [
        'response_hours' => env('BOOKING_REQUEST_EXPIRY_HOURS', 48),
        'reminder_hours_before_expiry' => env('BOOKING_REQUEST_REMINDER_HOURS', 12),
    ],
];
