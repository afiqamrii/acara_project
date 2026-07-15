<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Review;
use App\Models\ServiceProfile;
use App\Models\UserNotification;
use App\Notifications\BookingActivityEmail;

class NotificationService
{
    public function bookingSubmitted(Booking $booking): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'booking_request',
            title: 'New booking request',
            message: "{$booking->user->name} requested {$booking->serviceProfile->service_name} for {$this->date($booking)}. Please respond by {$this->deadline($booking)}.",
            actionUrl: '/vendor/bookings',
            extraData: [
                'expires_at' => $booking->expires_at?->toDateTimeString(),
            ],
        );
    }

    public function bookingApproved(Booking $booking): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'booking_approved',
            title: 'Booking approved',
            message: "Your {$booking->serviceProfile->service_name} booking for {$this->date($booking)} was approved.",
            actionUrl: '/bookings',
        );
    }

    public function bookingRejected(Booking $booking): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'booking_rejected',
            title: 'Booking request rejected',
            message: "Your {$booking->serviceProfile->service_name} booking was rejected. Reason: {$booking->rejection_reason}",
            actionUrl: '/bookings',
        );
    }

    public function bookingCancelledByVendor(Booking $booking): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'booking_cancelled',
            title: 'Booking cancelled by vendor',
            message: "Your {$booking->serviceProfile->service_name} booking was cancelled. Reason: {$booking->cancellation_reason}",
            actionUrl: '/bookings',
        );
    }

    public function bookingCancelledByOrganizer(Booking $booking): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'booking_cancelled',
            title: 'Booking cancelled by organizer',
            message: "{$booking->user->name} cancelled the {$booking->serviceProfile->service_name} booking for {$this->date($booking)}.",
            actionUrl: '/vendor/bookings',
        );
    }

    public function bookingCompleted(Booking $booking): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'booking_completed',
            title: 'Booking completed',
            message: "Your {$booking->serviceProfile->service_name} booking was marked as completed.",
            actionUrl: '/bookings',
        );
    }

    public function bookingExpiryReminder(Booking $booking): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'booking_expiry_reminder',
            title: 'Booking request response due soon',
            message: "{$booking->user->name}'s request for {$booking->serviceProfile->service_name} expires at {$this->deadline($booking)}.",
            actionUrl: '/vendor/bookings',
            extraData: [
                'expires_at' => $booking->expires_at?->toDateTimeString(),
            ],
        );
    }

    public function bookingExpiredForOrganizer(Booking $booking): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'booking_expired',
            title: 'Booking request expired',
            message: "Your {$booking->serviceProfile->service_name} request expired because the vendor did not respond in time. The date has been released.",
            actionUrl: '/bookings',
            extraData: [
                'expired_at' => $booking->expired_at?->toDateTimeString(),
            ],
        );
    }

    public function bookingExpiredForVendor(Booking $booking): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'booking_expired',
            title: 'Booking request expired',
            message: "{$booking->user->name}'s {$booking->serviceProfile->service_name} request expired without a response. The date is available again.",
            actionUrl: '/vendor/bookings',
            extraData: [
                'expired_at' => $booking->expired_at?->toDateTimeString(),
            ],
        );
    }

    public function reviewReceived(Review $review): UserNotification
    {
        $review->loadMissing(['booking.user', 'serviceProfile']);

        return $this->create(
            userId: $review->serviceProfile->user_id,
            booking: $review->booking,
            type: 'review_received',
            title: 'New '.$review->rating.'-star review',
            message: "{$review->booking->user->name} reviewed {$review->serviceProfile->service_name}.",
            actionUrl: '/marketplace/'.$review->service_profile_id,
            extraData: [
                'review_id' => $review->id,
                'rating' => $review->rating,
            ],
        );
    }

    public function serviceApproved(ServiceProfile $service): UserNotification
    {
        return $this->createServiceActivity(
            service: $service,
            type: 'service_approved',
            title: 'Service approved',
            message: "Your {$service->service_name} service was approved and is ready for the marketplace.",
        );
    }

    public function serviceRejected(ServiceProfile $service): UserNotification
    {
        return $this->createServiceActivity(
            service: $service,
            type: 'service_rejected',
            title: 'Service changes required',
            message: "Your {$service->service_name} service needs changes. Reason: {$service->rejection_reason}",
        );
    }

    private function create(
        int $userId,
        Booking $booking,
        string $type,
        string $title,
        string $message,
        string $actionUrl,
        array $extraData = [],
    ): UserNotification {
        $notification = UserNotification::create([
            'user_id' => $userId,
            'booking_id' => $booking->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => $actionUrl,
            'data' => array_merge([
                'booking_id' => $booking->id,
                'booking_reference' => 'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
                'service_name' => $booking->serviceProfile->service_name,
                'selected_date' => $booking->selected_date->format('Y-m-d'),
            ], $extraData),
        ]);

        $this->sendEmailIfEnabled($notification);

        return $notification;
    }

    private function createServiceActivity(
        ServiceProfile $service,
        string $type,
        string $title,
        string $message,
    ): UserNotification {
        $notification = UserNotification::create([
            'user_id' => $service->user_id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => '/vendor/services',
            'data' => [
                'service_id' => $service->id,
                'service_name' => $service->service_name,
                'service_status' => $service->status,
                'rejection_reason' => $service->rejection_reason,
            ],
        ]);

        $this->sendEmailIfEnabled($notification);

        return $notification;
    }

    private function sendEmailIfEnabled(UserNotification $notification): void
    {
        if (! config('acara.booking_email.enabled')) {
            return;
        }

        $notification->loadMissing('user');
        $notification->user->notify(new BookingActivityEmail($notification));
    }

    private function date(Booking $booking): string
    {
        return $booking->selected_date->format('j M Y');
    }

    private function deadline(Booking $booking): string
    {
        return $booking->expires_at?->format('j M Y, g:i A') ?? 'the response deadline';
    }
}
