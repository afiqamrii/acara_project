<?php

return [
    'booking_email' => [
        'enabled' => env('BOOKING_EMAIL_NOTIFICATIONS_ENABLED', false),
        'mailer' => env('BOOKING_EMAIL_MAILER', 'resend'),
        'queue_connection' => env('BOOKING_EMAIL_QUEUE_CONNECTION', 'database'),
        'queue' => env('BOOKING_EMAIL_QUEUE', 'emails'),
    ],
];
