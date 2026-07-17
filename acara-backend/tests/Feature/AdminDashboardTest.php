<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\BookingCompletion;
use App\Models\ServiceProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $vendor;

    private User $organizer;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-07-17 10:00:00');
        $this->admin = User::factory()->create(['role' => 'admin', 'name' => 'Operations Admin']);
        $this->vendor = User::factory()->create(['role' => 'vendor', 'name' => 'Farah Vendor']);
        $this->organizer = User::factory()->create(['role' => 'user', 'name' => 'Aina Organizer']);
        User::factory()->create(['role' => 'user', 'status' => 'suspended']);

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
            'ssm_document_path' => 'vendor/test.pdf',
            'business_name' => 'Farah Creative',
            'business_link' => 'https://example.test',
            'years_of_experience' => 4,
            'business_started_at' => now()->subYears(4)->toDateString(),
            'service_area_state' => 'Selangor',
            'service_area_town' => 'Shah Alam',
            'bank_name' => 'Test Bank',
            'bank_account_number' => '1234567890',
            'bank_holder_name' => 'Farah Vendor',
            'status' => 'pending_verification',
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_admin_dashboard_returns_live_counts_and_actionable_queues(): void
    {
        ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Pending Highlight Film',
            'service_category' => 'Videography',
            'service_details' => 'A pending service verification record.',
            'pricing_starting_from' => 2400,
            'pricing_unit' => 'event',
            'status' => 'pending_verification',
        ]);

        $pending = $this->booking([
            'status' => 'pending',
            'selected_date' => now()->addWeek()->toDateString(),
            'expires_at' => now()->addHours(4),
        ]);
        $disputed = $this->booking([
            'status' => 'confirmed',
            'completion_status' => 'completion_disputed',
            'selected_date' => now()->subDay()->toDateString(),
            'confirmed_at' => now()->subWeek(),
        ]);
        BookingCompletion::create([
            'booking_id' => $disputed->id,
            'submitted_by' => $this->vendor->id,
            'status' => 'disputed',
            'completion_note' => 'The photography files were delivered.',
            'response_due_at' => now()->addDay(),
            'submitted_at' => now()->subHours(2),
            'disputed_at' => now()->subHour(),
            'dispute_reason' => 'The final album is missing the requested stage photographs.',
        ]);
        $this->booking([
            'status' => 'confirmed',
            'selected_date' => now()->addMonth()->toDateString(),
            'confirmed_at' => now()->subDay(),
        ]);
        $this->booking([
            'status' => 'completed',
            'selected_date' => now()->subWeek()->toDateString(),
            'completed_at' => now()->subDay(),
        ]);
        $this->booking([
            'status' => 'cart',
            'selected_date' => now()->addMonths(2)->toDateString(),
        ]);

        Sanctum::actingAs($this->admin);
        $this->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('accounts.total', 3)
            ->assertJsonPath('accounts.active', 2)
            ->assertJsonPath('accounts.suspended', 1)
            ->assertJsonPath('accounts.organizers', 2)
            ->assertJsonPath('accounts.vendors', 1)
            ->assertJsonPath('verifications.total', 2)
            ->assertJsonPath('verifications.vendors', 1)
            ->assertJsonPath('verifications.services', 1)
            ->assertJsonPath('bookings.active', 3)
            ->assertJsonPath('bookings.pending_vendor', 1)
            ->assertJsonPath('bookings.confirmed', 2)
            ->assertJsonPath('bookings.needs_resolution', 1)
            ->assertJsonPath('bookings.completed_this_month', 1)
            ->assertJsonCount(2, 'queues.verifications')
            ->assertJsonCount(2, 'queues.bookings')
            ->assertJsonPath('queues.bookings.0.id', $disputed->id)
            ->assertJsonPath('queues.bookings.0.status', 'needs_resolution')
            ->assertJsonPath('queues.bookings.0.detail', 'The final album is missing the requested stage photographs.')
            ->assertJsonPath('queues.bookings.1.id', $pending->id)
            ->assertJsonPath('queues.bookings.1.status', 'awaiting_vendor')
            ->assertJsonPath('activity_scope', 'own');
    }

    public function test_dashboard_activity_respects_admin_audit_visibility_scope(): void
    {
        $otherAdmin = User::factory()->create(['role' => 'admin', 'name' => 'Other Admin']);
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $ownLog = $this->audit($this->admin, 'Approved a service verification.');
        $otherLog = $this->audit($otherAdmin, 'Suspended a marketplace account.');

        Sanctum::actingAs($this->admin);
        $this->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('activity_scope', 'own')
            ->assertJsonCount(1, 'recent_activity')
            ->assertJsonPath('recent_activity.0.id', $ownLog->id);

        Sanctum::actingAs($superAdmin);
        $this->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('activity_scope', 'platform')
            ->assertJsonCount(2, 'recent_activity')
            ->assertJsonFragment(['id' => $ownLog->id])
            ->assertJsonFragment(['id' => $otherLog->id]);
    }

    public function test_non_admin_cannot_access_operations_dashboard(): void
    {
        Sanctum::actingAs($this->organizer);
        $this->getJson('/api/admin/dashboard')->assertForbidden();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function booking(array $attributes): Booking
    {
        return Booking::create(array_merge([
            'user_id' => $this->organizer->id,
            'service_profile_id' => $this->service->id,
            'service_name_snapshot' => $this->service->service_name,
            'vendor_name_snapshot' => 'Farah Creative',
            'price_snapshot' => 1800,
            'pricing_unit_snapshot' => 'event',
            'selected_date' => now()->addWeek()->toDateString(),
            'status' => 'pending',
        ], $attributes));
    }

    private function audit(User $actor, string $description): AdminAuditLog
    {
        return AdminAuditLog::create([
            'actor_id' => $actor->id,
            'module' => 'services',
            'action' => 'service_approved',
            'subject_label' => 'Corporate Photography',
            'subject_reference' => 'SVC-000001',
            'description' => $description,
        ]);
    }
}
