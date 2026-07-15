<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Review;
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
            message: "{$booking->user->name} requested {$booking->serviceProfile->service_name} for {$this->date($booking)}.",
            actionUrl: '/vendor/bookings',
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

        if (config('acara.booking_email.enabled')) {
            $notification->loadMissing('user');
            $notification->user->notify(new BookingActivityEmail($notification));
        }

        return $notification;
    }

    private function date(Booking $booking): string
    {
        return $booking->selected_date->format('j M Y');
    }
}
