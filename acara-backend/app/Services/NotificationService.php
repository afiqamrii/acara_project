<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingRescheduleRequest;
use App\Models\Quotation;
use App\Models\Review;
use App\Models\ServiceProfile;
use App\Models\UserNotification;
use App\Notifications\BookingActivityEmail;

class NotificationService
{
    public function bookingSubmitted(Booking $booking): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user', 'brief']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'booking_request',
            title: 'New booking request',
            message: "{$booking->user->name} requested {$this->serviceName($booking)} for {$this->eventName($booking)} on {$this->date($booking)}. Please respond by {$this->deadline($booking)}.",
            actionUrl: '/vendor/bookings',
            extraData: [
                'expires_at' => $booking->expires_at?->toDateTimeString(),
                'event_title' => $booking->brief?->event_title,
                'event_type' => $booking->brief?->event_type,
                'venue_name' => $booking->brief?->venue_name,
            ],
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
            message: "Your {$this->serviceName($booking)} booking was rejected. Reason: {$booking->rejection_reason}",
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
            message: "Your {$this->serviceName($booking)} booking was cancelled. Reason: {$booking->cancellation_reason}",
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
            message: "{$booking->user->name} cancelled the {$this->serviceName($booking)} booking for {$this->date($booking)}.",
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
            message: "Your {$this->serviceName($booking)} booking was marked as completed.",
            actionUrl: '/bookings',
        );
    }

    public function quotationSent(Booking $booking, Quotation $quotation): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'quotation_sent',
            title: 'New quotation received',
            message: "Your {$this->serviceName($booking)} quotation {$quotation->reference()} is ready for RM ".number_format((float) $quotation->total_amount, 2).'. Respond by '.$quotation->valid_until->format('j M Y, g:i A').'.',
            actionUrl: '/bookings',
            extraData: $this->quotationData($quotation),
        );
    }

    public function quotationAccepted(Booking $booking, Quotation $quotation): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'quotation_accepted',
            title: 'Quotation accepted',
            message: "{$booking->user->name} accepted {$quotation->reference()} for RM ".number_format((float) $quotation->total_amount, 2).'. The booking is confirmed.',
            actionUrl: '/vendor/bookings',
            extraData: $this->quotationData($quotation),
        );
    }

    public function quotationDeclined(Booking $booking, Quotation $quotation): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'quotation_declined',
            title: 'Quotation declined',
            message: "{$booking->user->name} declined {$quotation->reference()}. Reason: {$quotation->response_note}",
            actionUrl: '/vendor/bookings',
            extraData: $this->quotationData($quotation),
        );
    }

    public function quotationRevisionRequested(Booking $booking, Quotation $quotation): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'quotation_revision_requested',
            title: 'Quotation revision requested',
            message: "{$booking->user->name} requested changes to {$quotation->reference()}. Reason: {$quotation->response_note}",
            actionUrl: '/vendor/bookings',
            extraData: $this->quotationData($quotation),
        );
    }

    public function quotationExpiryReminder(Booking $booking, Quotation $quotation): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'quotation_expiry_reminder',
            title: 'Quotation response due soon',
            message: "{$quotation->reference()} for {$this->serviceName($booking)} expires at {$quotation->valid_until->format('j M Y, g:i A')}.",
            actionUrl: '/bookings',
            extraData: $this->quotationData($quotation),
        );
    }

    public function quotationExpiredForOrganizer(Booking $booking, Quotation $quotation): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'quotation_expired',
            title: 'Quotation expired',
            message: "{$quotation->reference()} for {$this->serviceName($booking)} expired without a response. The event date was released.",
            actionUrl: '/bookings',
            extraData: $this->quotationData($quotation),
        );
    }

    public function quotationExpiredForVendor(Booking $booking, Quotation $quotation): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'quotation_expired',
            title: 'Quotation expired',
            message: "{$quotation->reference()} sent to {$booking->user->name} expired without a response. The event date was released.",
            actionUrl: '/vendor/bookings',
            extraData: $this->quotationData($quotation),
        );
    }

    public function rescheduleRequested(Booking $booking, BookingRescheduleRequest $request): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'booking_reschedule_requested',
            title: 'Booking date change requested',
            message: "{$booking->user->name} requested changing {$this->serviceName($booking)} from {$this->requestDate($request, 'original_date')} to {$this->requestDate($request, 'requested_date')}. Reason: {$request->reason}",
            actionUrl: '/vendor/bookings',
            extraData: $this->rescheduleData($request),
        );
    }

    public function rescheduleApproved(Booking $booking, BookingRescheduleRequest $request): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'booking_reschedule_approved',
            title: 'Booking date change approved',
            message: "Your {$this->serviceName($booking)} booking was moved to {$this->requestDate($request, 'requested_date')}.",
            actionUrl: '/bookings',
            extraData: $this->rescheduleData($request),
        );
    }

    public function rescheduleRejected(Booking $booking, BookingRescheduleRequest $request): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'booking_reschedule_rejected',
            title: 'Booking date change declined',
            message: "Your date change request was declined. The booking remains on {$this->requestDate($request, 'original_date')}. Reason: {$request->decision_reason}",
            actionUrl: '/bookings',
            extraData: $this->rescheduleData($request),
        );
    }

    public function rescheduleWithdrawn(Booking $booking, BookingRescheduleRequest $request): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'booking_reschedule_withdrawn',
            title: 'Date change request withdrawn',
            message: "{$booking->user->name} withdrew the request to move {$this->serviceName($booking)} to {$this->requestDate($request, 'requested_date')}.",
            actionUrl: '/vendor/bookings',
            extraData: $this->rescheduleData($request),
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
            message: "{$booking->user->name}'s request for {$this->serviceName($booking)} expires at {$this->deadline($booking)}.",
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
            message: "Your {$this->serviceName($booking)} request expired because the vendor did not respond in time. The date has been released.",
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
            message: "{$booking->user->name}'s {$this->serviceName($booking)} request expired without a response. The date is available again.",
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
            message: "{$review->booking->user->name} reviewed {$this->serviceName($review->booking)}.",
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
                'service_name' => $this->serviceName($booking),
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

    private function serviceName(Booking $booking): string
    {
        return $booking->service_name_snapshot
            ?: $booking->serviceProfile->service_name;
    }

    private function eventName(Booking $booking): string
    {
        return $booking->brief?->event_title ?? 'an event';
    }

    private function requestDate(BookingRescheduleRequest $request, string $field): string
    {
        return $request->{$field}->format('j M Y');
    }

    /**
     * @return array<string, mixed>
     */
    private function rescheduleData(BookingRescheduleRequest $request): array
    {
        return [
            'reschedule_request_id' => $request->id,
            'original_date' => $request->original_date->format('Y-m-d'),
            'requested_date' => $request->requested_date->format('Y-m-d'),
            'reschedule_status' => $request->status,
            'reschedule_reason' => $request->reason,
            'decision_reason' => $request->decision_reason,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function quotationData(Quotation $quotation): array
    {
        return [
            'quotation_id' => $quotation->id,
            'quotation_reference' => $quotation->reference(),
            'quotation_version' => $quotation->version,
            'quotation_status' => $quotation->status,
            'quotation_total' => (float) $quotation->total_amount,
            'quotation_valid_until' => $quotation->valid_until?->toDateTimeString(),
            'quotation_response_note' => $quotation->response_note,
        ];
    }
}
