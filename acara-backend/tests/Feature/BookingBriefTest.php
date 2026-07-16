<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingBrief;
use App\Models\ServiceAvailability;
use App\Models\ServiceProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingBriefTest extends TestCase
{
    use RefreshDatabase;

    private User $vendor;

    private User $customer;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = User::factory()->create([
            'name' => 'Aisyah Vendor',
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $this->customer = User::factory()->create([
            'name' => 'Danish Organizer',
            'role' => 'user',
        ]);
        $this->service = ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Premium Event Catering',
            'service_category' => 'Catering',
            'service_details' => 'Complete catering and service crew.',
            'pricing_starting_from' => 4500,
            'pricing_unit' => 'event',
            'status' => 'approved',
            'is_active' => true,
        ]);

        DB::table('vendor_profiles')->insert([
            'user_id' => $this->vendor->id,
            'ssm_number' => null,
            'ssm_document_path' => '',
            'business_name' => 'Aisyah Events',
            'business_link' => '',
            'years_of_experience' => 6,
            'business_started_at' => now()->subYears(6)->toDateString(),
            'service_area_state' => 'Selangor',
            'service_area_town' => 'Shah Alam',
            'bank_name' => 'Test Bank',
            'bank_account_number' => '0000000000',
            'bank_holder_name' => 'Aisyah Events',
            'status' => 'approved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_organizer_adds_and_edits_structured_brief_while_booking_is_in_cart(): void
    {
        $date = now()->addDays(10)->toDateString();
        $this->availability($date);

        Sanctum::actingAs($this->customer);
        $bookingId = $this->postJson('/api/bookings/cart', $this->cartPayload($date))
            ->assertCreated()
            ->json('booking_id');

        $this->assertDatabaseHas('booking_briefs', [
            'booking_id' => $bookingId,
            'event_title' => 'Acara Annual Dinner',
            'event_type' => 'Corporate Dinner',
            'guest_count' => 280,
        ]);

        $this->getJson('/api/bookings/cart')
            ->assertOk()
            ->assertJsonPath('items.0.brief.event_title', 'Acara Annual Dinner')
            ->assertJsonPath('items.0.brief.start_time', '18:30')
            ->assertJsonPath('items.0.notes', 'Please include a vegetarian menu section.');

        $payload = $this->cartPayload($date);
        $payload['brief']['event_title'] = 'Updated Acara Annual Dinner';
        $payload['brief']['guest_count'] = 320;
        $payload['notes'] = 'Please include vegetarian and vegan menu sections.';

        $this->putJson("/api/bookings/cart/{$bookingId}/brief", [
            'brief' => $payload['brief'],
            'notes' => $payload['notes'],
        ])
            ->assertOk()
            ->assertJsonPath('brief.event_title', 'Updated Acara Annual Dinner')
            ->assertJsonPath('brief.guest_count', 320);

        $this->assertDatabaseHas('bookings', [
            'id' => $bookingId,
            'notes' => 'Please include vegetarian and vegan menu sections.',
        ]);
    }

    public function test_structured_brief_validation_is_required_for_new_cart_items(): void
    {
        $date = now()->addDays(10)->toDateString();
        $this->availability($date);

        Sanctum::actingAs($this->customer);
        $this->postJson('/api/bookings/cart', [
            'service_id' => $this->service->id,
            'date' => $date,
            'brief' => [
                'event_title' => '',
                'start_time' => '20:00',
                'end_time' => '18:00',
                'guest_count' => 0,
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'brief.event_title',
                'brief.event_type',
                'brief.venue_name',
                'brief.venue_address',
                'brief.end_time',
                'brief.guest_count',
                'brief.contact_name',
                'brief.contact_phone',
            ]);

        $this->assertDatabaseCount('bookings', 0);
        $this->assertDatabaseCount('booking_briefs', 0);
    }

    public function test_confirmation_locks_brief_and_exposes_it_to_all_booking_roles(): void
    {
        $date = now()->addDays(10)->toDateString();
        $this->availability($date);

        Sanctum::actingAs($this->customer);
        $bookingId = $this->postJson('/api/bookings/cart', $this->cartPayload($date))
            ->assertCreated()
            ->json('booking_id');

        $this->postJson('/api/bookings/confirm')
            ->assertOk()
            ->assertJsonPath('booking_count', 1);

        $brief = BookingBrief::where('booking_id', $bookingId)->firstOrFail();
        $this->assertNotNull($brief->locked_at);
        $this->assertSame('pending', Booking::findOrFail($bookingId)->status);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $bookingId,
            'type' => 'booking_request',
        ]);
        $this->assertStringContainsString(
            'Acara Annual Dinner',
            DB::table('user_notifications')->where('booking_id', $bookingId)->value('message'),
        );

        $this->putJson("/api/bookings/cart/{$bookingId}/brief", [
            'brief' => $this->cartPayload($date)['brief'],
        ])->assertNotFound();

        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.brief.event_title', 'Acara Annual Dinner')
            ->assertJsonPath('bookings.0.brief.is_locked', true);

        Sanctum::actingAs($this->vendor);
        $this->getJson('/api/vendor/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.brief.venue_name', 'Grand Acara Ballroom')
            ->assertJsonPath('bookings.0.brief.contact_name', 'Danish Rahman');

        $admin = User::factory()->create(['role' => 'super_admin']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.brief.guest_count', 280)
            ->assertJsonPath('bookings.0.brief.requirements', 'Buffet service with a registration welcome drink.');

        $this->getJson("/api/admin/bookings/{$bookingId}")
            ->assertOk()
            ->assertJsonPath('booking.id', $bookingId)
            ->assertJsonPath('booking.brief.event_title', 'Acara Annual Dinner')
            ->assertJsonPath('booking.customer_email', $this->customer->email);

        $this->getJson('/api/admin/bookings/999999')->assertNotFound();
    }

    public function test_legacy_cart_item_without_brief_cannot_be_submitted(): void
    {
        $date = now()->addDays(10)->toDateString();
        $this->availability($date);
        $booking = Booking::create([
            'user_id' => $this->customer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => $date,
            'status' => 'cart',
        ]);

        Sanctum::actingAs($this->customer);
        $this->postJson('/api/bookings/confirm')
            ->assertUnprocessable()
            ->assertJsonPath('incomplete_ids.0', $booking->id);

        $this->assertSame('cart', $booking->refresh()->status);
        $this->assertTrue(ServiceAvailability::where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $date)
            ->exists());
    }

    /**
     * @return array<string, mixed>
     */
    private function cartPayload(string $date): array
    {
        return [
            'service_id' => $this->service->id,
            'date' => $date,
            'brief' => [
                'event_title' => 'Acara Annual Dinner',
                'event_type' => 'Corporate Dinner',
                'venue_name' => 'Grand Acara Ballroom',
                'venue_address' => '12 Jalan Acara, Shah Alam, Selangor',
                'start_time' => '18:30',
                'end_time' => '23:00',
                'guest_count' => 280,
                'contact_name' => 'Danish Rahman',
                'contact_phone' => '+60 12-345 6789',
                'setup_time' => '15:30',
                'requirements' => 'Buffet service with a registration welcome drink.',
            ],
            'notes' => 'Please include a vegetarian menu section.',
        ];
    }

    private function availability(string $date): void
    {
        ServiceAvailability::create([
            'service_profile_id' => $this->service->id,
            'available_date' => $date,
        ]);
    }
}
