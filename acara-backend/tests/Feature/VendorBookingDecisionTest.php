<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VendorBookingDecisionTest extends TestCase
{
    use RefreshDatabase;

    private User $vendor;

    private User $customer;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $this->customer = User::factory()->create(['role' => 'user']);

        $this->service = ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Wedding Photography',
            'service_category' => 'Photography',
            'service_details' => 'Full-day photography service.',
            'pricing_starting_from' => 1500,
            'pricing_unit' => 'event',
            'pricing_description' => 'Starting package',
            'status' => 'approved',
        ]);

        DB::table('vendor_profiles')->insert([
            'user_id' => $this->vendor->id,
            'ssm_number' => null,
            'ssm_document_path' => '',
            'business_name' => 'Lens Studio',
            'business_link' => '',
            'years_of_experience' => 3,
            'business_started_at' => now()->subYears(3)->toDateString(),
            'service_area_state' => 'Selangor',
            'service_area_town' => 'Shah Alam',
            'bank_name' => 'Test Bank',
            'bank_account_number' => '0000000000',
            'bank_holder_name' => 'Lens Studio',
            'status' => 'approved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_rejection_requires_a_meaningful_reason(): void
    {
        $booking = $this->bookingWithStatus('pending');
        Sanctum::actingAs($this->vendor);

        $this->patchJson("/api/vendor/bookings/{$booking->id}/reject", [
            'reason' => 'Too short',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'pending',
            'rejection_reason' => null,
        ]);
    }

    public function test_vendor_can_reject_pending_request_and_organizer_can_see_reason(): void
    {
        $booking = $this->bookingWithStatus('pending');
        $reason = 'The crew is already assigned to another booking on this date.';
        Sanctum::actingAs($this->vendor);

        $this->patchJson("/api/vendor/bookings/{$booking->id}/reject", [
            'reason' => $reason,
        ])->assertOk()
            ->assertJsonPath('status', 'rejected')
            ->assertJsonPath('reason', $reason);

        $booking->refresh();
        $this->assertSame('rejected', $booking->status);
        $this->assertSame($reason, $booking->rejection_reason);
        $this->assertNotNull($booking->rejected_at);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->customer->id,
            'booking_id' => $booking->id,
            'type' => 'booking_rejected',
        ]);
        $this->assertTrue(ServiceAvailability::query()
            ->where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $booking->selected_date)
            ->exists());

        $this->getJson('/api/vendor/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.status', 'rejected')
            ->assertJsonPath('bookings.0.rejection_reason', $reason);

        Sanctum::actingAs($this->customer);
        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.status', 'rejected')
            ->assertJsonPath('bookings.0.rejection_reason', $reason);
    }

    public function test_vendor_can_cancel_confirmed_booking_and_organizer_can_see_reason(): void
    {
        $booking = $this->bookingWithStatus('confirmed');
        $reason = 'A medical emergency means our assigned team cannot attend the event.';
        Sanctum::actingAs($this->vendor);

        $this->patchJson("/api/vendor/bookings/{$booking->id}/cancel", [
            'reason' => $reason,
        ])->assertOk()
            ->assertJsonPath('status', 'cancelled')
            ->assertJsonPath('reason', $reason);

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertSame($reason, $booking->cancellation_reason);
        $this->assertSame('vendor', $booking->cancelled_by);
        $this->assertNotNull($booking->cancelled_at);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->customer->id,
            'booking_id' => $booking->id,
            'type' => 'booking_cancelled',
        ]);
        $this->assertTrue(ServiceAvailability::query()
            ->where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $booking->selected_date)
            ->exists());

        $this->getJson('/api/vendor/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.status', 'cancelled')
            ->assertJsonPath('bookings.0.cancellation_reason', $reason);

        Sanctum::actingAs($this->customer);
        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.status', 'cancelled')
            ->assertJsonPath('bookings.0.cancelled_by', 'vendor')
            ->assertJsonPath('bookings.0.cancellation_reason', $reason);
    }

    public function test_vendor_cannot_cancel_a_pending_request(): void
    {
        $booking = $this->bookingWithStatus('pending');
        Sanctum::actingAs($this->vendor);

        $this->patchJson("/api/vendor/bookings/{$booking->id}/cancel", [
            'reason' => 'This request should be rejected instead of cancelled.',
        ])->assertNotFound();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'pending',
            'cancellation_reason' => null,
        ]);
    }

    public function test_vendor_cannot_reject_another_vendors_request(): void
    {
        $otherVendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        Sanctum::actingAs($otherVendor);
        $booking = $this->bookingWithStatus('pending');

        $this->patchJson("/api/vendor/bookings/{$booking->id}/reject", [
            'reason' => 'This vendor does not own the requested service.',
        ])->assertNotFound();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'pending',
            'rejection_reason' => null,
        ]);
    }

    private function bookingWithStatus(string $status): Booking
    {
        return Booking::create([
            'user_id' => $this->customer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => now()->addDays(7)->toDateString(),
            'status' => $status,
            'notes' => 'Please arrive before the ceremony begins.',
        ]);
    }
}
