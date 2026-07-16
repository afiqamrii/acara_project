<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Models\UserNotification;
use App\Notifications\BookingActivityEmail;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $vendor;

    private User $customer;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-07-15 10:00:00');
        config()->set([
            'acara.booking_lifecycle.response_hours' => 48,
            'acara.booking_lifecycle.reminder_hours_before_expiry' => 12,
        ]);

        $this->vendor = User::factory()->create([
            'name' => 'Farah Vendor',
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $this->customer = User::factory()->create([
            'name' => 'Aina Organizer',
            'role' => 'user',
        ]);
        $this->service = ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Corporate Event Photography',
            'service_category' => 'Photography',
            'service_details' => 'Full-day photography for a corporate event.',
            'pricing_starting_from' => 1800,
            'pricing_unit' => 'event',
            'status' => 'approved',
            'is_active' => true,
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
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_confirmed_cart_receives_configured_response_deadline(): void
    {
        $selectedDate = now()->addDays(10)->toDateString();
        DB::table('service_availabilities')->insert([
            'service_profile_id' => $this->service->id,
            'available_date' => $selectedDate,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $booking = $this->booking('cart', $selectedDate);

        Sanctum::actingAs($this->customer);
        $this->postJson('/api/bookings/confirm')
            ->assertOk()
            ->assertJsonPath('booking_count', 1);

        $booking->refresh();
        $this->assertSame('pending', $booking->status);
        $this->assertTrue($booking->expires_at->equalTo(now()->addHours(48)));
        $this->assertNull($booking->reminder_sent_at);
        $this->assertNull($booking->expired_at);
        $this->assertDatabaseMissing('service_availabilities', [
            'service_profile_id' => $this->service->id,
            'available_date' => $selectedDate,
        ]);

        $notification = UserNotification::where([
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_request',
        ])->firstOrFail();
        $this->assertSame('2026-07-17 10:00:00', $notification->data['expires_at']);
    }

    public function test_lifecycle_command_sends_only_one_vendor_reminder(): void
    {
        $booking = $this->booking('pending', now()->addDays(8)->toDateString(), [
            'expires_at' => now()->addHours(11),
        ]);

        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Expired booking requests: 0')
            ->expectsOutput('Vendor reminders sent: 1')
            ->assertSuccessful();

        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Expired booking requests: 0')
            ->expectsOutput('Vendor reminders sent: 0')
            ->assertSuccessful();

        $this->assertNotNull($booking->refresh()->reminder_sent_at);
        $this->assertSame(1, UserNotification::where([
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_expiry_reminder',
        ])->count());
    }

    public function test_lifecycle_command_expires_request_releases_date_and_notifies_both_parties(): void
    {
        $selectedDate = now()->addDays(9)->toDateString();
        $booking = $this->booking('pending', $selectedDate, [
            'expires_at' => now()->subMinute(),
        ]);

        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Expired booking requests: 1')
            ->expectsOutput('Vendor reminders sent: 0')
            ->assertSuccessful();

        $booking->refresh();
        $this->assertSame('expired', $booking->status);
        $this->assertNotNull($booking->expired_at);
        $this->assertNull($booking->cancelled_by);
        $this->assertNull($booking->cancellation_reason);
        $this->assertTrue(ServiceAvailability::where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $selectedDate)
            ->exists());

        foreach ([$this->customer, $this->vendor] as $recipient) {
            $this->assertDatabaseHas('user_notifications', [
                'user_id' => $recipient->id,
                'booking_id' => $booking->id,
                'type' => 'booking_expired',
            ]);
        }

        $this->artisan('bookings:process-lifecycle')->assertSuccessful();
        $this->assertSame(2, UserNotification::where([
            'booking_id' => $booking->id,
            'type' => 'booking_expired',
        ])->count());

        Sanctum::actingAs($this->vendor);
        $this->getJson('/api/vendor/bookings')
            ->assertOk()
            ->assertJsonPath('counts.expired', 1)
            ->assertJsonPath('bookings.0.status', 'expired');

        Sanctum::actingAs($this->customer);
        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('stats.expired', 1)
            ->assertJsonPath('bookings.0.status', 'expired');
    }

    public function test_overdue_requests_are_expired_during_late_actions(): void
    {
        $approveBooking = $this->booking('pending', now()->addDays(6)->toDateString(), [
            'expires_at' => now()->subSecond(),
        ]);
        $rejectBooking = $this->booking('pending', now()->addDays(7)->toDateString(), [
            'expires_at' => now()->subSecond(),
        ]);
        $cancelBooking = $this->booking('pending', now()->addDays(8)->toDateString(), [
            'expires_at' => now()->subSecond(),
        ]);

        Sanctum::actingAs($this->vendor);
        $this->patchJson("/api/vendor/bookings/{$approveBooking->id}/approve")
            ->assertStatus(409);
        $this->patchJson("/api/vendor/bookings/{$rejectBooking->id}/reject", [
            'reason' => 'The request deadline has already elapsed for this booking.',
        ])->assertStatus(409);

        Sanctum::actingAs($this->customer);
        $this->patchJson("/api/bookings/{$cancelBooking->id}/cancel")
            ->assertStatus(409);

        foreach ([$approveBooking, $rejectBooking, $cancelBooking] as $booking) {
            $this->assertSame('expired', $booking->refresh()->status);
            $this->assertTrue(ServiceAvailability::where('service_profile_id', $this->service->id)
                ->whereDate('available_date', $booking->selected_date->toDateString())
                ->exists());
        }
    }

    public function test_organizer_can_submit_a_fresh_attempt_after_expiry(): void
    {
        $selectedDate = now()->addDays(11)->toDateString();
        $expiredBooking = $this->booking('expired', $selectedDate, [
            'expires_at' => now()->subDay(),
            'expired_at' => now()->subDay(),
        ]);
        ServiceAvailability::create([
            'service_profile_id' => $this->service->id,
            'available_date' => $selectedDate,
        ]);

        Sanctum::actingAs($this->customer);
        $response = $this->postJson('/api/bookings/cart', [
            'service_id' => $this->service->id,
            'date' => $selectedDate,
            'notes' => 'This is a fresh request after the previous one expired.',
            'brief' => $this->briefData(),
        ])->assertCreated();

        $this->assertNotSame($expiredBooking->id, $response->json('booking_id'));
        $this->assertSame(2, Booking::where([
            'user_id' => $this->customer->id,
            'service_profile_id' => $this->service->id,
        ])->whereDate('selected_date', $selectedDate)->count());
    }

    public function test_expiry_queues_resend_email_notifications_for_both_parties(): void
    {
        config()->set([
            'acara.booking_email.enabled' => true,
            'acara.booking_email.mailer' => 'resend',
            'acara.booking_email.queue_connection' => 'database',
            'acara.booking_email.queue' => 'emails',
        ]);
        Notification::fake();

        $booking = $this->booking('pending', now()->addDays(12)->toDateString(), [
            'expires_at' => now()->subMinute(),
        ]);

        $this->artisan('bookings:process-lifecycle')->assertSuccessful();

        foreach ([$this->customer, $this->vendor] as $recipient) {
            Notification::assertSentTo(
                $recipient,
                BookingActivityEmail::class,
                fn (BookingActivityEmail $notification): bool => $notification->activity->booking_id === $booking->id
                    && $notification->activity->type === 'booking_expired'
                    && $notification->connection === 'database'
                    && $notification->queue === 'emails'
                    && $notification->afterCommit === true,
            );
        }
    }

    private function booking(string $status, string $selectedDate, array $attributes = []): Booking
    {
        $booking = Booking::create(array_merge([
            'user_id' => $this->customer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => $selectedDate,
            'status' => $status,
            'notes' => 'Please arrive before the event begins.',
        ], $attributes));

        if ($status === 'cart') {
            $booking->brief()->create($this->briefData());
        }

        return $booking;
    }

    private function briefData(): array
    {
        return [
            'event_title' => 'Corporate Product Launch',
            'event_type' => 'Corporate Event',
            'venue_name' => 'Acara Convention Centre',
            'venue_address' => 'Shah Alam, Selangor',
            'start_time' => '10:00',
            'end_time' => '17:00',
            'guest_count' => 200,
            'contact_name' => 'Aina Organizer',
            'contact_phone' => '+60 12-000 0000',
            'setup_time' => '08:00',
            'requirements' => 'Full photography coverage is required.',
        ];
    }
}
