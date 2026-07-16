<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRescheduleRequest;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Notifications\BookingActivityEmail;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingRescheduleTest extends TestCase
{
    use RefreshDatabase;

    private User $vendor;

    private User $customer;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-07-16 10:00:00');
        config()->set('acara.booking_email.enabled', false);

        $this->vendor = User::factory()->create([
            'name' => 'Nadia Vendor',
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $this->customer = User::factory()->create([
            'name' => 'Hakim Organizer',
            'role' => 'user',
        ]);
        $this->service = ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Corporate Catering',
            'service_category' => 'Catering',
            'service_details' => 'Full-service catering for corporate events.',
            'pricing_starting_from' => 3200,
            'pricing_unit' => 'event',
            'status' => 'approved',
            'is_active' => true,
        ]);

        DB::table('vendor_profiles')->insert([
            'user_id' => $this->vendor->id,
            'ssm_number' => null,
            'ssm_document_path' => '',
            'business_name' => 'Nadia Catering Co',
            'business_link' => '',
            'years_of_experience' => 5,
            'business_started_at' => now()->subYears(5)->toDateString(),
            'service_area_state' => 'Selangor',
            'service_area_town' => 'Petaling Jaya',
            'bank_name' => 'Test Bank',
            'bank_account_number' => '0000000000',
            'bank_holder_name' => 'Nadia Catering Co',
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

    public function test_organizer_can_request_one_date_change_without_releasing_either_slot(): void
    {
        Notification::fake();
        config()->set('acara.booking_email.enabled', true);

        $booking = $this->confirmedBooking(now()->addDays(5)->toDateString());
        $requestedDate = now()->addDays(8)->toDateString();
        $this->availability($requestedDate);

        Sanctum::actingAs($this->customer);
        $this->getJson("/api/bookings/{$booking->id}/reschedule/availability")
            ->assertOk()
            ->assertJsonPath('current_date', $booking->selected_date->format('Y-m-d'))
            ->assertJsonPath('dates.0', $requestedDate);

        $this->postJson("/api/bookings/{$booking->id}/reschedule", [
            'requested_date' => $requestedDate,
            'reason' => 'The venue informed us that the original hall is unavailable.',
        ])
            ->assertCreated()
            ->assertJsonPath('reschedule_request.status', 'pending')
            ->assertJsonPath('reschedule_request.requested_date', $requestedDate);

        $this->assertSame(now()->addDays(5)->toDateString(), $booking->refresh()->selected_date->format('Y-m-d'));
        $this->assertTrue($this->availabilityExists($requestedDate));
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_reschedule_requested',
        ]);
        Notification::assertSentTo(
            $this->vendor,
            BookingActivityEmail::class,
            fn (BookingActivityEmail $notification): bool => $notification->activity->type === 'booking_reschedule_requested',
        );

        $secondDate = now()->addDays(10)->toDateString();
        $this->availability($secondDate);
        $this->postJson("/api/bookings/{$booking->id}/reschedule", [
            'requested_date' => $secondDate,
            'reason' => 'We would like to submit another date while the first is pending.',
        ])->assertConflict();

        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.reschedule_request.requested_date', $requestedDate);
    }

    public function test_vendor_approval_moves_booking_and_swaps_availability_atomically(): void
    {
        $originalDate = now()->addDays(5)->toDateString();
        $requestedDate = now()->addDays(8)->toDateString();
        $booking = $this->confirmedBooking($originalDate);
        $this->availability($requestedDate);
        $rescheduleRequest = $this->requestDateChange($booking, $requestedDate);

        Sanctum::actingAs($this->vendor);
        $this->patchJson("/api/vendor/bookings/{$booking->id}/reschedule/approve")
            ->assertOk()
            ->assertJsonPath('selected_date', $requestedDate)
            ->assertJsonPath('reschedule_request.status', 'approved');

        $this->assertSame($requestedDate, $booking->refresh()->selected_date->format('Y-m-d'));
        $this->assertSame('approved', $rescheduleRequest->refresh()->status);
        $this->assertSame($this->vendor->id, $rescheduleRequest->decided_by);
        $this->assertNotNull($rescheduleRequest->decided_at);
        $this->assertTrue($this->availabilityExists($originalDate));
        $this->assertFalse($this->availabilityExists($requestedDate));
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->customer->id,
            'booking_id' => $booking->id,
            'type' => 'booking_reschedule_approved',
        ]);

        Sanctum::actingAs($this->customer);
        $response = $this->getJson('/api/bookings')->assertOk();
        $types = collect($response->json('bookings.0.timeline'))->pluck('type');
        $this->assertTrue($types->contains('reschedule_requested'));
        $this->assertTrue($types->contains('reschedule_approved'));
        $response->assertJsonPath('bookings.0.reschedule_request', null);
        $response->assertJsonPath('bookings.0.reschedule_history.0.status', 'approved');
        $response->assertJsonPath('bookings.0.reschedule_history.0.original_date', $originalDate);

        $admin = User::factory()->create(['role' => 'super_admin']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.selected_date', $requestedDate)
            ->assertJsonPath('bookings.0.reschedule_history.0.status', 'approved');
    }

    public function test_vendor_can_decline_and_organizer_can_withdraw_date_change_requests(): void
    {
        $originalDate = now()->addDays(5)->toDateString();
        $requestedDate = now()->addDays(8)->toDateString();
        $booking = $this->confirmedBooking($originalDate);
        $this->availability($requestedDate);
        $rescheduleRequest = $this->requestDateChange($booking, $requestedDate);

        Sanctum::actingAs($this->vendor);
        $this->patchJson("/api/vendor/bookings/{$booking->id}/reschedule/reject", [
            'reason' => 'Our catering team is already committed to another event that day.',
        ])
            ->assertOk()
            ->assertJsonPath('reschedule_request.status', 'rejected');

        $this->assertSame($originalDate, $booking->refresh()->selected_date->format('Y-m-d'));
        $this->assertSame('rejected', $rescheduleRequest->refresh()->status);
        $this->assertTrue($this->availabilityExists($requestedDate));

        Sanctum::actingAs($this->customer);
        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.reschedule_history.0.status', 'rejected')
            ->assertJsonPath('bookings.0.reschedule_history.0.decision_reason', 'Our catering team is already committed to another event that day.');

        $secondDate = now()->addDays(10)->toDateString();
        $this->availability($secondDate);
        $secondRequest = $this->requestDateChange($booking, $secondDate);

        Sanctum::actingAs($this->customer);
        $this->patchJson("/api/bookings/{$booking->id}/reschedule/withdraw")
            ->assertOk();

        $this->assertSame('withdrawn', $secondRequest->refresh()->status);
        $this->assertNotNull($secondRequest->withdrawn_at);
        $this->assertSame($originalDate, $booking->refresh()->selected_date->format('Y-m-d'));
        $this->assertTrue($this->availabilityExists($secondDate));
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_reschedule_withdrawn',
        ]);
    }

    public function test_only_owning_vendor_can_decide_and_unavailable_date_cannot_be_approved(): void
    {
        $booking = $this->confirmedBooking(now()->addDays(5)->toDateString());
        $requestedDate = now()->addDays(8)->toDateString();
        $this->availability($requestedDate);
        $rescheduleRequest = $this->requestDateChange($booking, $requestedDate);

        $otherVendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        Sanctum::actingAs($otherVendor);
        $this->patchJson("/api/vendor/bookings/{$booking->id}/reschedule/approve")
            ->assertNotFound();

        ServiceAvailability::where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $requestedDate)
            ->delete();

        Sanctum::actingAs($this->vendor);
        $this->patchJson("/api/vendor/bookings/{$booking->id}/reschedule/approve")
            ->assertConflict()
            ->assertJsonPath('message', 'The requested date is no longer available.');

        $this->assertSame('pending', $rescheduleRequest->refresh()->status);
        $this->assertSame(now()->addDays(5)->toDateString(), $booking->refresh()->selected_date->format('Y-m-d'));
    }

    public function test_pending_date_change_blocks_completion_and_is_closed_by_cancellation(): void
    {
        $originalDate = now()->addDay()->toDateString();
        $requestedDate = now()->addDays(4)->toDateString();
        $booking = $this->confirmedBooking($originalDate);
        $this->availability($requestedDate);
        $rescheduleRequest = $this->requestDateChange($booking, $requestedDate);

        Carbon::setTestNow('2026-07-17 10:00:00');
        Sanctum::actingAs($this->vendor);
        $this->patchJson("/api/vendor/bookings/{$booking->id}/complete")
            ->assertConflict()
            ->assertJsonPath('message', 'Resolve the pending date change request before completing this booking.');

        $this->patchJson("/api/vendor/bookings/{$booking->id}/cancel", [
            'reason' => 'The business can no longer deliver this booking as confirmed.',
        ])->assertOk();

        $this->assertSame('cancelled', $booking->refresh()->status);
        $this->assertSame('withdrawn', $rescheduleRequest->refresh()->status);
        $this->assertSame('Booking was cancelled.', $rescheduleRequest->decision_reason);
    }

    private function confirmedBooking(string $selectedDate): Booking
    {
        return Booking::create([
            'user_id' => $this->customer->id,
            'service_profile_id' => $this->service->id,
            'service_name_snapshot' => $this->service->service_name,
            'vendor_name_snapshot' => 'Nadia Catering Co',
            'price_snapshot' => $this->service->pricing_starting_from,
            'pricing_unit_snapshot' => $this->service->pricing_unit,
            'selected_date' => $selectedDate,
            'status' => 'confirmed',
            'confirmed_at' => now()->subHour(),
            'created_at' => now()->subDay(),
            'updated_at' => now()->subHour(),
        ]);
    }

    private function requestDateChange(Booking $booking, string $requestedDate): BookingRescheduleRequest
    {
        Sanctum::actingAs($this->customer);
        $this->postJson("/api/bookings/{$booking->id}/reschedule", [
            'requested_date' => $requestedDate,
            'reason' => 'The venue asked us to move the event to a different available date.',
        ])->assertCreated();

        return BookingRescheduleRequest::where('booking_id', $booking->id)
            ->latest('id')
            ->firstOrFail();
    }

    private function availability(string $date): void
    {
        ServiceAvailability::create([
            'service_profile_id' => $this->service->id,
            'available_date' => $date,
        ]);
    }

    private function availabilityExists(string $date): bool
    {
        return ServiceAvailability::where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $date)
            ->exists();
    }
}
