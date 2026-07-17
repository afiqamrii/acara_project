<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\BookingCompletion;
use App\Models\ServiceProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminReportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $vendor;

    private User $organizer;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-07-17 12:00:00');
        $this->admin = User::factory()->create([
            'role' => 'admin',
            'created_at' => now()->subYear(),
        ]);
        $this->vendor = User::factory()->create([
            'role' => 'vendor',
            'created_at' => now()->subDays(8),
        ]);
        $this->organizer = User::factory()->create([
            'role' => 'user',
            'created_at' => now()->subDays(6),
        ]);
        $this->service = ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Corporate Photography',
            'service_category' => 'Photography',
            'service_details' => 'Corporate event photography.',
            'pricing_starting_from' => 1800,
            'pricing_unit' => 'event',
            'status' => 'approved',
            'is_active' => true,
        ]);
        $this->service->forceFill([
            'created_at' => now()->subMonths(2),
            'updated_at' => now()->subDays(4),
        ])->save();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_admin_can_view_date_scoped_operational_report(): void
    {
        AdminAuditLog::create([
            'actor_id' => $this->admin->id,
            'module' => 'services',
            'action' => 'service_approved',
            'subject_label' => 'Corporate Photography',
            'description' => 'Approved a marketplace service.',
            'created_at' => now()->subDays(4),
        ]);
        foreach (['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired'] as $offset => $status) {
            $this->booking($status, now()->subDays($offset + 1), $offset + 1);
        }
        $this->booking('pending', now()->subMonths(2), 20);
        $this->booking('cart', now()->subDay(), 30);

        $disputedBooking = $this->booking('confirmed', now()->subDays(3), 40, 'completion_disputed');
        BookingCompletion::create([
            'booking_id' => $disputedBooking->id,
            'submitted_by' => $this->vendor->id,
            'status' => 'disputed',
            'completion_note' => 'Delivery submitted.',
            'response_due_at' => now()->addDay(),
            'submitted_at' => now()->subDays(2),
            'disputed_at' => now()->subDay(),
            'dispute_reason' => 'Required files were missing.',
        ]);

        Sanctum::actingAs($this->admin);
        $this->getJson('/api/admin/reports/operations?date_from=2026-07-01&date_to=2026-07-17')
            ->assertOk()
            ->assertJsonPath('period.days', 17)
            ->assertJsonPath('summary.booking_requests', 7)
            ->assertJsonPath('summary.conversion_rate', 42.9)
            ->assertJsonPath('summary.new_accounts', 2)
            ->assertJsonPath('summary.completion_issues', 1)
            ->assertJsonPath('booking_funnel.pending', 1)
            ->assertJsonPath('booking_funnel.confirmed', 2)
            ->assertJsonPath('booking_funnel.completed', 1)
            ->assertJsonPath('booking_funnel.rejected', 1)
            ->assertJsonPath('booking_funnel.cancelled', 1)
            ->assertJsonPath('booking_funnel.expired', 1)
            ->assertJsonPath('accounts.organizers', 1)
            ->assertJsonPath('accounts.vendors', 1)
            ->assertJsonPath('verifications.approved', 1)
            ->assertJsonPath('completion_issues.open_current', 1)
            ->assertJsonCount(17, 'daily_activity');
    }

    public function test_report_range_is_validated_and_limited_to_one_year(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/admin/reports/operations?date_from=2026-07-18&date_to=2026-07-17')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date_from', 'date_to']);
        $this->getJson('/api/admin/reports/operations?date_from=2025-01-01&date_to=2026-07-17')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('date_from');
    }

    public function test_admin_can_export_safe_csv_and_export_is_audited(): void
    {
        $this->organizer->update(['name' => '=HYPERLINK("https://malicious.test")']);
        $booking = $this->booking('pending', now()->subDay(), 1);
        $booking->update(['service_name_snapshot' => '+Injected formula']);
        $outside = $this->booking('confirmed', now()->subMonths(2), 2);

        Sanctum::actingAs($this->admin);
        $response = $this->get('/api/admin/reports/operations/export?date_from=2026-07-01&date_to=2026-07-17');
        $response->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8')
            ->assertDownload('acara-operations-20260701-20260717.csv');

        $csv = $response->streamedContent();
        $this->assertStringContainsString('Booking Reference', $csv);
        $this->assertStringContainsString("'+Injected formula", $csv);
        $this->assertStringContainsString("'=HYPERLINK", $csv);
        $this->assertStringContainsString('ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT), $csv);
        $this->assertStringNotContainsString('ACR-'.str_pad((string) $outside->id, 6, '0', STR_PAD_LEFT), $csv);

        $audit = AdminAuditLog::where('action', 'operations_report_exported')->firstOrFail();
        $this->assertSame($this->admin->id, $audit->actor_id);
        $this->assertSame(1, $audit->metadata['row_count']);
        $this->assertSame('csv', $audit->metadata['format']);
    }

    public function test_non_admin_cannot_access_or_export_reports(): void
    {
        Sanctum::actingAs($this->organizer);
        $this->getJson('/api/admin/reports/operations')->assertForbidden();
        $this->get('/api/admin/reports/operations/export')->assertForbidden();
    }

    private function booking(
        string $status,
        Carbon $createdAt,
        int $dateOffset,
        ?string $completionStatus = null,
    ): Booking {
        $booking = Booking::create([
            'user_id' => $this->organizer->id,
            'service_profile_id' => $this->service->id,
            'service_name_snapshot' => $this->service->service_name,
            'vendor_name_snapshot' => 'Farah Creative',
            'price_snapshot' => 1800,
            'pricing_unit_snapshot' => 'event',
            'selected_date' => now()->addDays($dateOffset)->toDateString(),
            'status' => $status,
            'completion_status' => $completionStatus,
            'completed_at' => $status === 'completed' ? $createdAt->copy()->addDay() : null,
        ]);
        $booking->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->save();

        return $booking;
    }
}
