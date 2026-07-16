<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Models\UserNotification;
use App\Notifications\BookingActivityEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_and_read_only_their_own_notifications(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $first = $this->notificationFor($user, 'First notification');
        $this->notificationFor($user, 'Second notification');
        $otherNotification = $this->notificationFor($otherUser, 'Private notification');

        Sanctum::actingAs($user);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'notifications')
            ->assertJsonPath('unread_count', 2);

        $this->patchJson("/api/notifications/{$otherNotification->id}/read")
            ->assertNotFound();

        $this->patchJson("/api/notifications/{$first->id}/read")
            ->assertOk()
            ->assertJsonPath('notification.id', $first->id);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unread_count', 1);

        $this->patchJson('/api/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('updated', 1);

        $this->getJson('/api/notifications?filter=unread')
            ->assertOk()
            ->assertJsonCount(0, 'notifications')
            ->assertJsonPath('unread_count', 0);
    }

    public function test_booking_submission_quotation_acceptance_and_completion_create_notifications(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $vendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $service = ServiceProfile::create([
            'user_id' => $vendor->id,
            'service_name' => 'Wedding Photography',
            'service_category' => 'Photography',
            'service_details' => 'Full-day photography service.',
            'pricing_starting_from' => 1500,
            'pricing_unit' => 'event',
            'status' => 'approved',
        ]);
        $selectedDate = now()->toDateString();
        DB::table('service_availabilities')->insert([
            'service_profile_id' => $service->id,
            'available_date' => $selectedDate,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $booking = Booking::create([
            'user_id' => $customer->id,
            'service_profile_id' => $service->id,
            'selected_date' => $selectedDate,
            'status' => 'cart',
        ]);
        $this->attachBrief($booking);

        Sanctum::actingAs($customer);
        $this->postJson('/api/bookings/confirm')
            ->assertOk()
            ->assertJsonPath('booking_count', 1);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_request',
        ]);

        Sanctum::actingAs($vendor);
        $quotationId = $this->postJson("/api/vendor/bookings/{$booking->id}/quotations", [
            'items' => [[
                'description' => 'Wedding photography package',
                'quantity' => 1,
                'unit_price' => 1500,
            ]],
            'valid_until' => $selectedDate,
        ])->assertCreated()->json('quotation.id');

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $customer->id,
            'booking_id' => $booking->id,
            'type' => 'quotation_sent',
        ]);
        Sanctum::actingAs($customer);
        $this->patchJson("/api/bookings/{$booking->id}/quotations/{$quotationId}/accept")
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $vendor->id,
            'booking_id' => $booking->id,
            'type' => 'quotation_accepted',
        ]);

        Sanctum::actingAs($vendor);
        $this->postJson("/api/vendor/bookings/{$booking->id}/completion", [
            'note' => 'The wedding photography coverage has been delivered as agreed.',
        ])
            ->assertCreated()
            ->assertJsonPath('status', 'completion_pending');

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $customer->id,
            'booking_id' => $booking->id,
            'type' => 'completion_submitted',
        ]);
        $this->postJson("/api/vendor/bookings/{$booking->id}/completion", [
            'note' => 'A duplicate completion attempt must be rejected.',
        ])->assertNotFound();
        $this->assertSame(1, UserNotification::where([
            'user_id' => $customer->id,
            'booking_id' => $booking->id,
            'type' => 'completion_submitted',
        ])->count());

        Sanctum::actingAs($customer);
        $this->patchJson("/api/bookings/{$booking->id}/completion/confirm")
            ->assertOk()
            ->assertJsonPath('status', 'completed');
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $vendor->id,
            'booking_id' => $booking->id,
            'type' => 'completion_confirmed',
        ]);
    }

    public function test_organizer_cancellation_notifies_vendor(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $vendor = User::factory()->create(['role' => 'vendor']);
        $service = ServiceProfile::create([
            'user_id' => $vendor->id,
            'service_name' => 'Catering Package',
            'service_category' => 'Catering',
            'service_details' => 'Buffet catering service.',
            'pricing_starting_from' => 2000,
            'pricing_unit' => 'event',
            'status' => 'approved',
        ]);
        $booking = Booking::create([
            'user_id' => $customer->id,
            'service_profile_id' => $service->id,
            'selected_date' => now()->addDays(10)->toDateString(),
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($customer);
        $this->patchJson("/api/bookings/{$booking->id}/cancel")
            ->assertOk();

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_cancelled',
        ]);
        $this->patchJson("/api/bookings/{$booking->id}/cancel")
            ->assertNotFound();
        $this->assertSame(1, UserNotification::where([
            'user_id' => $vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_cancelled',
        ])->count());
    }

    public function test_booking_notification_queues_a_resend_email_when_enabled(): void
    {
        config()->set([
            'acara.booking_email.enabled' => true,
            'acara.booking_email.mailer' => 'resend',
            'acara.booking_email.queue_connection' => 'database',
            'acara.booking_email.queue' => 'emails',
            'app.name' => 'ACARA',
            'app.frontend_url' => 'http://localhost:5173',
        ]);
        Notification::fake();

        $customer = User::factory()->create([
            'name' => 'Aina Organizer',
            'role' => 'user',
        ]);
        $vendor = User::factory()->create([
            'name' => 'Farah Vendor',
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $service = ServiceProfile::create([
            'user_id' => $vendor->id,
            'service_name' => 'Event Photography',
            'service_category' => 'Photography',
            'service_details' => 'Full-day event photography.',
            'pricing_starting_from' => 1500,
            'pricing_unit' => 'event',
            'status' => 'approved',
        ]);
        $selectedDate = now()->addDays(7)->toDateString();
        DB::table('service_availabilities')->insert([
            'service_profile_id' => $service->id,
            'available_date' => $selectedDate,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $booking = Booking::create([
            'user_id' => $customer->id,
            'service_profile_id' => $service->id,
            'selected_date' => $selectedDate,
            'status' => 'cart',
        ]);
        $this->attachBrief($booking);

        Sanctum::actingAs($customer);
        $this->postJson('/api/bookings/confirm')
            ->assertOk();

        Notification::assertSentTo(
            $vendor,
            BookingActivityEmail::class,
            function (BookingActivityEmail $notification) use ($booking, $vendor): bool {
                $mail = $notification->toMail($vendor);

                return $notification->activity->booking_id === $booking->id
                    && $notification->activity->type === 'booking_request'
                    && $notification->connection === 'database'
                    && $notification->queue === 'emails'
                    && $notification->afterCommit === true
                    && $mail->mailer === 'resend'
                    && $mail->subject === 'ACARA: New booking request'
                    && $mail->actionUrl === 'http://localhost:5173/vendor/bookings'
                    && in_array('Booking reference: ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT), $mail->introLines, true);
            },
        );
    }

    private function notificationFor(User $user, string $title): UserNotification
    {
        return UserNotification::create([
            'user_id' => $user->id,
            'type' => 'system',
            'title' => $title,
            'message' => 'Test notification body.',
            'action_url' => '/bookings',
        ]);
    }

    private function attachBrief(Booking $booking): void
    {
        $booking->brief()->create([
            'event_title' => 'Wedding Reception',
            'event_type' => 'Wedding',
            'venue_name' => 'Acara Grand Hall',
            'venue_address' => 'Kuala Lumpur, Malaysia',
            'start_time' => '18:00',
            'end_time' => '23:00',
            'guest_count' => 300,
            'contact_name' => 'Aina Organizer',
            'contact_phone' => '+60 12-000 0000',
            'setup_time' => '15:00',
            'requirements' => 'Full event coverage is required.',
        ]);
    }
}
