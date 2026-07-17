<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingMessage;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Notifications\BookingActivityEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingMessageTest extends TestCase
{
    use RefreshDatabase;

    private User $organizer;

    private User $vendor;

    private User $admin;

    private ServiceProfile $service;

    private Booking $booking;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organizer = User::factory()->create([
            'name' => 'Aina Organizer',
            'role' => 'user',
        ]);
        $this->vendor = User::factory()->create([
            'name' => 'Farah Vendor',
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $this->admin = User::factory()->create([
            'name' => 'Admin Reviewer',
            'role' => 'admin',
        ]);
        $this->service = ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Corporate Photography',
            'service_category' => 'Photography',
            'service_details' => 'Professional corporate event coverage.',
            'pricing_starting_from' => 2500,
            'pricing_unit' => 'event',
            'status' => 'approved',
        ]);
        DB::table('vendor_profiles')->insert([
            'user_id' => $this->vendor->id,
            'ssm_number' => null,
            'ssm_document_path' => '',
            'business_name' => 'Farah Visuals',
            'business_link' => '',
            'years_of_experience' => 4,
            'business_started_at' => now()->subYears(4)->toDateString(),
            'service_area_state' => 'Selangor',
            'service_area_town' => 'Shah Alam',
            'bank_name' => 'Test Bank',
            'bank_account_number' => '0000000000',
            'bank_holder_name' => 'Farah Visuals',
            'status' => 'approved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->booking = Booking::create([
            'user_id' => $this->organizer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => now()->addDays(10)->toDateString(),
            'status' => 'pending',
        ]);
    }

    public function test_organizer_and_vendor_can_exchange_messages_and_track_reads(): void
    {
        Sanctum::actingAs($this->organizer);
        $messageId = $this->postJson("/api/bookings/{$this->booking->id}/messages", [
            'message' => 'Can your team arrive two hours before the event for setup?',
        ])
            ->assertCreated()
            ->assertJsonPath('booking_message.is_mine', true)
            ->assertJsonPath('booking_message.sender.name', 'Aina Organizer')
            ->json('booking_message.id');

        $this->assertDatabaseHas('booking_messages', [
            'id' => $messageId,
            'booking_id' => $this->booking->id,
            'sender_id' => $this->organizer->id,
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $this->booking->id,
            'type' => 'booking_message',
            'action_url' => "/vendor/bookings/{$this->booking->id}?conversation=1",
        ]);

        Sanctum::actingAs($this->vendor);
        $this->getJson("/api/bookings/{$this->booking->id}/messages")
            ->assertOk()
            ->assertJsonPath('participant_role', 'vendor')
            ->assertJsonPath('can_send', true)
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('messages.0.is_mine', false)
            ->assertJsonPath('messages.0.read_at', null);

        $this->getJson('/api/vendor/booking-conversations')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('conversations.0.booking_id', $this->booking->id)
            ->assertJsonPath('conversations.0.customer.name', 'Aina Organizer')
            ->assertJsonPath('conversations.0.last_message.message', 'Can your team arrive two hours before the event for setup?');

        $this->patchJson("/api/bookings/{$this->booking->id}/messages/read")
            ->assertOk()
            ->assertJsonPath('updated', 1)
            ->assertJsonPath('unread_count', 0);

        $this->assertNotNull(BookingMessage::findOrFail($messageId)->read_at);
        $this->assertDatabaseMissing('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $this->booking->id,
            'type' => 'booking_message',
            'read_at' => null,
        ]);

        $this->postJson("/api/bookings/{$this->booking->id}/messages", [
            'message' => 'Yes, our setup team can be at the venue two hours earlier.',
        ])->assertCreated();

        Sanctum::actingAs($this->organizer);
        $this->getJson("/api/bookings/{$this->booking->id}/messages")
            ->assertOk()
            ->assertJsonCount(2, 'messages')
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('messages.1.sender.name', 'Farah Vendor')
            ->assertJsonPath('messages.1.is_mine', false);

        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.message_count', 2)
            ->assertJsonPath('bookings.0.unread_message_count', 1);

        $this->getJson("/api/bookings/{$this->booking->id}")
            ->assertOk()
            ->assertJsonPath('booking.message_count', 2)
            ->assertJsonPath('booking.unread_message_count', 1);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->organizer->id,
            'booking_id' => $this->booking->id,
            'type' => 'booking_message',
            'action_url' => "/bookings/{$this->booking->id}?conversation=1",
        ]);

        Sanctum::actingAs($this->vendor);
        $this->getJson('/api/vendor/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.message_count', 2)
            ->assertJsonPath('bookings.0.unread_message_count', 0);
    }

    public function test_conversation_access_is_limited_and_admin_is_read_only(): void
    {
        $this->booking->messages()->create([
            'sender_id' => $this->organizer->id,
            'message' => 'Please confirm the final setup arrangement.',
        ]);
        $outsider = User::factory()->create(['role' => 'user']);

        Sanctum::actingAs($outsider);
        $this->getJson("/api/bookings/{$this->booking->id}/messages")->assertNotFound();
        $this->postJson("/api/bookings/{$this->booking->id}/messages", [
            'message' => 'I should not be able to join this conversation.',
        ])->assertNotFound();

        Sanctum::actingAs($this->admin);
        $this->getJson("/api/bookings/{$this->booking->id}/messages")
            ->assertOk()
            ->assertJsonPath('participant_role', 'admin')
            ->assertJsonPath('can_send', false)
            ->assertJsonPath('unread_count', 0)
            ->assertJsonCount(1, 'messages');

        $this->getJson("/api/admin/bookings/{$this->booking->id}")
            ->assertOk()
            ->assertJsonPath('booking.message_count', 1);

        $this->postJson("/api/bookings/{$this->booking->id}/messages", [
            'message' => 'Admins must not participate in the booking conversation.',
        ])->assertForbidden();
        $this->patchJson("/api/bookings/{$this->booking->id}/messages/read")->assertForbidden();
    }

    public function test_closed_booking_conversation_remains_available_but_read_only(): void
    {
        $this->booking->messages()->create([
            'sender_id' => $this->vendor->id,
            'message' => 'The agreed service has now been delivered.',
        ]);
        $this->booking->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($this->organizer);
        $this->getJson("/api/bookings/{$this->booking->id}/messages")
            ->assertOk()
            ->assertJsonPath('can_send', false)
            ->assertJsonPath('messages.0.message', 'The agreed service has now been delivered.');

        $this->postJson("/api/bookings/{$this->booking->id}/messages", [
            'message' => 'A closed conversation cannot receive new messages.',
        ])->assertConflict();
    }

    public function test_booking_message_queues_configured_email_notification(): void
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

        Sanctum::actingAs($this->organizer);
        $this->postJson("/api/bookings/{$this->booking->id}/messages", [
            'message' => 'Please confirm whether the venue loading bay is suitable.',
        ])->assertCreated();

        Notification::assertSentTo(
            $this->vendor,
            BookingActivityEmail::class,
            function (BookingActivityEmail $notification): bool {
                $mail = $notification->toMail($this->vendor);

                return $notification->activity->type === 'booking_message'
                    && $notification->connection === 'database'
                    && $notification->queue === 'emails'
                    && $notification->afterCommit === true
                    && $mail->mailer === 'resend'
                    && $mail->subject === 'ACARA: New booking message'
                    && $mail->actionUrl === "http://localhost:5173/vendor/bookings/{$this->booking->id}?conversation=1";
            },
        );
    }
}
