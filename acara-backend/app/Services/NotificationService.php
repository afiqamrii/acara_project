<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingCompletion;
use App\Models\BookingMessage;
use App\Models\BookingRescheduleRequest;
use App\Models\Quotation;
use App\Models\Review;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\UserNotificationPreference;
use App\Notifications\BookingActivityEmail;

class NotificationService
{
    public function bookingMessage(Booking $booking, BookingMessage $bookingMessage, User $sender, User $recipient): UserNotification
    {
        $booking->loadMissing('serviceProfile');
        $actionUrl = $recipient->id === $booking->user_id
            ? "/bookings?conversation={$booking->id}"
            : "/vendor/bookings?conversation={$booking->id}";

        return $this->create(
            userId: $recipient->id,
            booking: $booking,
            type: 'booking_message',
            title: 'New booking message',
            message: "{$sender->name} sent a message about {$this->serviceName($booking)}: ".str($bookingMessage->message)->limit(160),
            actionUrl: $actionUrl,
            extraData: [
                'booking_message_id' => $bookingMessage->id,
                'message_sender_id' => $sender->id,
                'message_sender_name' => $sender->name,
            ],
        );
    }

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

    public function completionSubmitted(Booking $booking, BookingCompletion $completion): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'completion_submitted',
            title: 'Confirm service completion',
            message: "The vendor submitted completion for {$this->serviceName($booking)}. Confirm it or report an issue by {$this->completionDeadline($completion)}.",
            actionUrl: '/bookings',
            extraData: $this->completionData($completion),
        );
    }

    public function completionReminder(Booking $booking, BookingCompletion $completion): UserNotification
    {
        $booking->loadMissing('serviceProfile');

        return $this->create(
            userId: $booking->user_id,
            booking: $booking,
            type: 'completion_response_reminder',
            title: 'Completion confirmation due soon',
            message: "Please confirm {$this->serviceName($booking)} or report an issue by {$this->completionDeadline($completion)}.",
            actionUrl: '/bookings',
            extraData: $this->completionData($completion),
        );
    }

    public function completionConfirmed(Booking $booking, BookingCompletion $completion): UserNotification
    {
        $booking->loadMissing(['serviceProfile', 'user']);

        return $this->create(
            userId: $booking->serviceProfile->user_id,
            booking: $booking,
            type: 'completion_confirmed',
            title: 'Service completion confirmed',
            message: "{$booking->user->name} confirmed completion of {$this->serviceName($booking)}.",
            actionUrl: '/vendor/bookings',
            extraData: $this->completionData($completion),
        );
    }

    /**
     * @return array<int, UserNotification>
     */
    public function completionDisputed(Booking $booking, BookingCompletion $completion): array
    {
        $booking->loadMissing(['serviceProfile', 'user']);
        $notifications = [
            $this->create(
                userId: $booking->serviceProfile->user_id,
                booking: $booking,
                type: 'completion_disputed',
                title: 'Completion issue reported',
                message: "{$booking->user->name} reported an issue with {$this->serviceName($booking)}. Reason: {$completion->dispute_reason}",
                actionUrl: '/vendor/bookings',
                extraData: $this->completionData($completion),
            ),
        ];

        User::whereIn('role', ['admin', 'super_admin'])
            ->pluck('id')
            ->each(function (int $userId) use ($booking, $completion, &$notifications): void {
                $notifications[] = $this->create(
                    userId: $userId,
                    booking: $booking,
                    type: 'completion_disputed',
                    title: 'Completion dispute requires review',
                    message: "{$booking->user->name} disputed completion of {$this->serviceName($booking)}. Reason: {$completion->dispute_reason}",
                    actionUrl: "/admin/bookings/{$booking->id}",
                    extraData: $this->completionData($completion),
                );
            });

        return $notifications;
    }

    /**
     * @return array<int, UserNotification>
     */
    public function completionResolved(Booking $booking, BookingCompletion $completion): array
    {
        $booking->loadMissing(['serviceProfile', 'user']);
        $completed = $completion->resolution === 'complete';
        $title = $completed ? 'Completion dispute approved' : 'Completion returned for follow-up';
        $outcome = $completed
            ? 'The administrator marked the booking as completed.'
            : 'The administrator returned the booking to the vendor for another completion submission.';
        $message = "{$outcome} Reason: {$completion->resolution_note}";

        return [
            $this->create(
                userId: $booking->user_id,
                booking: $booking,
                type: 'completion_resolved',
                title: $title,
                message: $message,
                actionUrl: '/bookings',
                extraData: $this->completionData($completion),
            ),
            $this->create(
                userId: $booking->serviceProfile->user_id,
                booking: $booking,
                type: 'completion_resolved',
                title: $title,
                message: $message,
                actionUrl: '/vendor/bookings',
                extraData: $this->completionData($completion),
            ),
        ];
    }

    /**
     * @return array<int, UserNotification>
     */
    public function completionAutoConfirmed(Booking $booking, BookingCompletion $completion): array
    {
        $booking->loadMissing('serviceProfile');
        $message = "{$this->serviceName($booking)} was confirmed automatically because the organizer response period ended without an issue report.";

        return [
            $this->create(
                userId: $booking->user_id,
                booking: $booking,
                type: 'completion_auto_confirmed',
                title: 'Completion confirmed automatically',
                message: $message,
                actionUrl: '/bookings',
                extraData: $this->completionData($completion),
            ),
            $this->create(
                userId: $booking->serviceProfile->user_id,
                booking: $booking,
                type: 'completion_auto_confirmed',
                title: 'Completion confirmed automatically',
                message: $message,
                actionUrl: '/vendor/bookings',
                extraData: $this->completionData($completion),
            ),
        ];
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
        $actionUrl = match ($actionUrl) {
            '/bookings' => "/bookings/{$booking->id}",
            '/vendor/bookings' => "/vendor/bookings/{$booking->id}",
            "/bookings?conversation={$booking->id}" => "/bookings/{$booking->id}?conversation=1",
            "/vendor/bookings?conversation={$booking->id}" => "/vendor/bookings/{$booking->id}?conversation=1",
            default => $actionUrl,
        };

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

        $notification->loadMissing('user.notificationPreference');

        $preferences = $notification->user->notificationPreference
            ?? new UserNotificationPreference(UserNotificationPreference::DEFAULTS);

        if (! $preferences->allowsEmailFor($notification->type)) {
            return;
        }

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

    private function completionDeadline(BookingCompletion $completion): string
    {
        return $completion->response_due_at->format('j M Y, g:i A');
    }

    /**
     * @return array<string, mixed>
     */
    private function completionData(BookingCompletion $completion): array
    {
        return [
            'completion_id' => $completion->id,
            'completion_status' => $completion->status,
            'response_due_at' => $completion->response_due_at?->toDateTimeString(),
            'dispute_reason' => $completion->dispute_reason,
            'resolution' => $completion->resolution,
            'resolution_note' => $completion->resolution_note,
        ];
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
