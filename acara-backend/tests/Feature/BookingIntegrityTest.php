<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private User $vendor;

    private User $customer;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-07-16 10:00:00');

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
            'service_name' => 'Corporate Photography',
            'service_category' => 'Photography',
            'service_details' => 'Full-day corporate event coverage.',
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

    public function test_reopened_date_allows_exactly_one_additional_booking_request(): void
    {
        $selectedDate = now()->addDays(7)->toDateString();
        $firstCustomer = User::factory()->create(['role' => 'user']);
        Booking::create([
            'user_id' => $firstCustomer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => $selectedDate,
            'status' => 'confirmed',
            'confirmed_at' => now()->subHour(),
        ]);

        $this->availability($selectedDate);
        $additionalBooking = $this->booking($this->customer, 'cart', $selectedDate);

        Sanctum::actingAs($this->customer);
        $this->postJson('/api/bookings/confirm')
            ->assertOk()
            ->assertJsonPath('booking_count', 1);

        $this->assertSame('pending', $additionalBooking->refresh()->status);
        $this->assertFalse(ServiceAvailability::where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $selectedDate)
            ->exists());

        $thirdCustomer = User::factory()->create(['role' => 'user']);
        $thirdBooking = $this->booking($thirdCustomer, 'cart', $selectedDate);
        Sanctum::actingAs($thirdCustomer);
        $this->postJson('/api/bookings/confirm')
            ->assertUnprocessable()
            ->assertJsonPath('unavailable_ids.0', $thirdBooking->id);
    }

    public function test_confirmation_preserves_service_vendor_and_price_snapshot(): void
    {
        $selectedDate = now()->addDays(8)->toDateString();
        $this->availability($selectedDate);
        $booking = $this->booking($this->customer, 'cart', $selectedDate);

        Sanctum::actingAs($this->customer);
        $this->postJson('/api/bookings/confirm')->assertOk();

        $booking->refresh();
        $this->assertSame('Corporate Photography', $booking->service_name_snapshot);
        $this->assertSame('Farah Visuals', $booking->vendor_name_snapshot);
        $this->assertSame('1800.00', $booking->price_snapshot);
        $this->assertSame('event', $booking->pricing_unit_snapshot);

        $this->service->update([
            'service_name' => 'Updated Photography Package',
            'pricing_starting_from' => 2500,
            'pricing_unit' => 'day',
        ]);
        DB::table('vendor_profiles')->where('user_id', $this->vendor->id)->update([
            'business_name' => 'Renamed Visual Company',
        ]);

        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.service_name', 'Corporate Photography')
            ->assertJsonPath('bookings.0.vendor_name', 'Farah Visuals')
            ->assertJsonPath('bookings.0.price_value', 1800)
            ->assertJsonPath('bookings.0.pricing_unit', 'event');
    }

    public function test_vendor_cannot_complete_booking_before_event_date(): void
    {
        $booking = $this->booking($this->customer, 'confirmed', now()->addDay()->toDateString(), [
            'confirmed_at' => now()->subHour(),
        ]);

        Sanctum::actingAs($this->vendor);
        $this->patchJson("/api/vendor/bookings/{$booking->id}/complete")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This booking can only be completed on or after the event date.');

        $booking->refresh();
        $this->assertSame('confirmed', $booking->status);
        $this->assertNull($booking->completed_at);

        Sanctum::actingAs($this->customer);
        $this->getJson('/api/reviews')
            ->assertOk()
            ->assertJsonPath('summary.total', 0);
        $this->postJson("/api/bookings/{$booking->id}/review", [
            'rating' => 5,
            'comment' => 'This review must remain locked before valid completion.',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('booking');
    }

    public function test_completion_on_event_date_records_timestamp_and_timeline(): void
    {
        $booking = $this->booking($this->customer, 'pending', today()->toDateString(), [
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($this->vendor);
        $this->patchJson("/api/vendor/bookings/{$booking->id}/approve")
            ->assertOk();
        $this->patchJson("/api/vendor/bookings/{$booking->id}/complete")
            ->assertOk()
            ->assertJsonPath('status', 'completed');

        $booking->refresh();
        $this->assertNotNull($booking->confirmed_at);
        $this->assertNotNull($booking->completed_at);

        $this->getJson('/api/vendor/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.status', 'completed')
            ->assertJsonPath('bookings.0.timeline.0.type', 'submitted')
            ->assertJsonPath('bookings.0.timeline.1.type', 'confirmed')
            ->assertJsonPath('bookings.0.timeline.2.type', 'completed');

        Sanctum::actingAs($this->customer);
        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.timeline.2.type', 'completed');
        $this->getJson('/api/reviews')
            ->assertOk()
            ->assertJsonPath('summary.total', 1)
            ->assertJsonPath('summary.awaiting_review', 1);

        $admin = User::factory()->create(['role' => 'super_admin']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.timeline.2.type', 'completed');
    }

    private function booking(User $customer, string $status, string $selectedDate, array $attributes = []): Booking
    {
        return Booking::create(array_merge([
            'user_id' => $customer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => $selectedDate,
            'status' => $status,
            'notes' => 'Please arrive before the event begins.',
        ], $attributes));
    }

    private function availability(string $selectedDate): void
    {
        DB::table('service_availabilities')->insert([
            'service_profile_id' => $this->service->id,
            'available_date' => $selectedDate,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
