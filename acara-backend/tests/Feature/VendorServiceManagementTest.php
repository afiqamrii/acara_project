<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Review;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Notifications\BookingActivityEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VendorServiceManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $vendor;

    private User $otherVendor;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('acara.booking_email.enabled', false);

        $this->vendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $this->otherVendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $this->service = ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Corporate Event Photography',
            'service_category' => 'Photography',
            'service_details' => 'Professional photography coverage for corporate events.',
            'pricing_starting_from' => 1800,
            'pricing_unit' => 'event',
            'pricing_description' => 'Includes eight hours of photography coverage.',
            'status' => 'approved',
            'is_active' => true,
        ]);
    }

    public function test_vendor_can_list_only_their_services_with_management_summary(): void
    {
        ServiceProfile::create([
            'user_id' => $this->otherVendor->id,
            'service_name' => 'Private Service',
            'service_category' => 'Catering',
            'service_details' => 'This service belongs to another vendor.',
            'pricing_starting_from' => 900,
            'pricing_unit' => 'event',
            'status' => 'approved',
        ]);

        Sanctum::actingAs($this->vendor);

        $this->getJson('/api/vendor/services')
            ->assertOk()
            ->assertJsonCount(1, 'services')
            ->assertJsonPath('services.0.id', $this->service->id)
            ->assertJsonPath('services.0.display_status', 'approved')
            ->assertJsonPath('summary.total', 1)
            ->assertJsonPath('summary.active', 1);

        $this->getJson("/api/vendor/services/{$this->service->id}")
            ->assertOk()
            ->assertJsonPath('service.service_name', 'Corporate Event Photography');
    }

    public function test_vendor_can_pause_and_resume_an_approved_service(): void
    {
        Sanctum::actingAs($this->vendor);

        $this->patchJson("/api/vendor/services/{$this->service->id}/visibility", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('service.display_status', 'paused');

        $this->assertDatabaseHas('service_profiles', [
            'id' => $this->service->id,
            'status' => 'approved',
            'is_active' => false,
        ]);
        $this->getJson("/api/marketplace/services/{$this->service->id}")
            ->assertNotFound();

        $this->patchJson("/api/vendor/services/{$this->service->id}/visibility", [
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('service.display_status', 'approved');

        $this->getJson("/api/marketplace/services/{$this->service->id}")
            ->assertOk();
    }

    public function test_approved_service_edit_requires_reverification_and_preserves_history(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $booking = Booking::create([
            'user_id' => $customer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => now()->subDay()->toDateString(),
            'status' => 'completed',
        ]);
        Review::create([
            'booking_id' => $booking->id,
            'service_profile_id' => $this->service->id,
            'user_id' => $customer->id,
            'rating' => 5,
            'comment' => 'A reliable service with excellent communication and delivery.',
        ]);

        Sanctum::actingAs($this->vendor);
        $this->patchJson("/api/vendor/services/{$this->service->id}", [
            'service_name' => 'Corporate Photography Plus',
            'service_category' => 'Photography',
            'service_details' => 'Updated premium photography coverage for corporate events.',
            'pricing_starting_from' => 2200,
            'pricing_unit' => 'event',
            'pricing_description' => 'Includes ten hours and an edited digital gallery.',
        ])
            ->assertOk()
            ->assertJsonPath('service.status', 'pending_verification')
            ->assertJsonPath('service.booking_count', 1)
            ->assertJsonPath('service.review_count', 1);

        $this->assertDatabaseHas('service_profiles', [
            'id' => $this->service->id,
            'service_name' => 'Corporate Photography Plus',
            'status' => 'pending_verification',
        ]);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id]);
        $this->assertDatabaseHas('reviews', ['booking_id' => $booking->id]);
        $this->getJson("/api/marketplace/services/{$this->service->id}")
            ->assertNotFound();

        Sanctum::actingAs($this->otherVendor);
        $this->patchJson("/api/vendor/services/{$this->service->id}", [
            'service_name' => 'Unauthorized update',
        ])->assertNotFound();
    }

    public function test_admin_rejection_requires_reason_and_vendor_can_resubmit(): void
    {
        $this->service->update(['status' => 'pending_verification']);
        $admin = User::factory()->create([
            'role' => 'admin',
            'profile_completed' => true,
        ]);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/services/{$this->service->id}/reject")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $this->patchJson("/api/admin/services/{$this->service->id}/reject", [
            'reason' => 'Please provide clearer package inclusions and portfolio samples.',
        ])->assertOk();

        $this->assertDatabaseHas('service_profiles', [
            'id' => $this->service->id,
            'status' => 'rejected',
            'rejection_reason' => 'Please provide clearer package inclusions and portfolio samples.',
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'type' => 'service_rejected',
        ]);

        Sanctum::actingAs($this->vendor);
        $this->postJson("/api/vendor/services/{$this->service->id}/resubmit")
            ->assertOk()
            ->assertJsonPath('service.status', 'pending_verification');

        $this->assertDatabaseHas('service_profiles', [
            'id' => $this->service->id,
            'status' => 'pending_verification',
            'rejection_reason' => null,
        ]);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/services/{$this->service->id}/approve")
            ->assertOk();

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'type' => 'service_approved',
        ]);
    }

    public function test_service_decision_queues_vendor_email_when_enabled(): void
    {
        Notification::fake();
        config()->set([
            'acara.booking_email.enabled' => true,
            'acara.booking_email.queue_connection' => 'database',
            'acara.booking_email.queue' => 'emails',
            'app.frontend_url' => 'http://localhost:5173',
        ]);

        $this->service->update(['status' => 'pending_verification']);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/services/{$this->service->id}/approve")
            ->assertOk();

        Notification::assertSentTo(
            $this->vendor,
            BookingActivityEmail::class,
            function (BookingActivityEmail $notification): bool {
                $mail = $notification->toMail($this->vendor);

                return $notification->activity->booking_id === null
                    && $notification->activity->type === 'service_approved'
                    && $notification->connection === 'database'
                    && $notification->queue === 'emails'
                    && $mail->actionText === 'Manage service'
                    && $mail->actionUrl === 'http://localhost:5173/vendor/services';
            },
        );
    }
}
