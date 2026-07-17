<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Quotation;
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

class QuotationTest extends TestCase
{
    use RefreshDatabase;

    private User $vendor;

    private User $customer;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-07-16 10:00:00');
        config()->set('acara.booking_lifecycle.response_hours', 48);

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
            'service_name' => 'Corporate Event Production',
            'service_category' => 'Event Production',
            'service_details' => 'Complete production crew and equipment.',
            'pricing_starting_from' => 1500,
            'pricing_unit' => 'event',
            'status' => 'approved',
            'is_active' => true,
        ]);

        DB::table('vendor_profiles')->insert([
            'user_id' => $this->vendor->id,
            'ssm_number' => null,
            'ssm_document_path' => '',
            'business_name' => 'Farah Event Works',
            'business_link' => '',
            'years_of_experience' => 5,
            'business_started_at' => now()->subYears(5)->toDateString(),
            'service_area_state' => 'Selangor',
            'service_area_town' => 'Shah Alam',
            'bank_name' => 'Test Bank',
            'bank_account_number' => '0000000000',
            'bank_holder_name' => 'Farah Event Works',
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

    public function test_vendor_sends_server_calculated_quotation_visible_to_all_roles(): void
    {
        $booking = $this->booking();

        Sanctum::actingAs($this->vendor);
        $this->postJson("/api/vendor/bookings/{$booking->id}/quotations", $this->quotationPayload())
            ->assertCreated()
            ->assertJsonPath('quotation.reference', 'Q-ACR'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT).'-V1')
            ->assertJsonPath('quotation.subtotal', 1800)
            ->assertJsonPath('quotation.discount_amount', 100)
            ->assertJsonPath('quotation.tax_amount', 136)
            ->assertJsonPath('quotation.total_amount', 1836)
            ->assertJsonCount(2, 'quotation.items');

        $this->assertDatabaseHas('quotations', [
            'booking_id' => $booking->id,
            'version' => 1,
            'status' => 'sent',
            'total_amount' => 1836,
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->customer->id,
            'booking_id' => $booking->id,
            'type' => 'quotation_sent',
        ]);
        $this->assertSame('2026-07-18 23:59:59', $booking->refresh()->expires_at->toDateTimeString());

        $this->postJson("/api/vendor/bookings/{$booking->id}/quotations", $this->quotationPayload())
            ->assertConflict();
        $this->patchJson("/api/vendor/bookings/{$booking->id}/reject", [
            'reason' => 'This must wait until the organizer responds to the quotation.',
        ])->assertConflict();

        Sanctum::actingAs($this->customer);
        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.quotation.version', 1)
            ->assertJsonPath('bookings.0.quotation.total_amount', 1836);

        Sanctum::actingAs($this->vendor);
        $this->getJson('/api/vendor/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.quotation.status', 'sent');

        Sanctum::actingAs(User::factory()->create(['role' => 'super_admin']));
        $this->getJson('/api/admin/bookings')
            ->assertOk()
            ->assertJsonPath('bookings.0.quotation.items.1.description', 'Sound system and technician');
    }

    public function test_revision_request_allows_new_version_and_preserves_history(): void
    {
        $booking = $this->booking();
        $first = $this->sendQuotation($booking);

        Sanctum::actingAs($this->customer);
        $reason = 'Please remove the additional sound system from the package.';
        $this->patchJson("/api/bookings/{$booking->id}/quotations/{$first->id}/revision", [
            'reason' => $reason,
        ])
            ->assertOk()
            ->assertJsonPath('quotation.status', 'revision_requested')
            ->assertJsonPath('quotation.response_note', $reason);

        $this->assertTrue($booking->refresh()->expires_at->equalTo(now()->addHours(48)));
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'quotation_revision_requested',
        ]);

        $revisedPayload = $this->quotationPayload();
        $revisedPayload['items'] = [$revisedPayload['items'][0]];
        $revisedPayload['discount_amount'] = 0;
        $revisedPayload['tax_rate'] = 0;

        Sanctum::actingAs($this->vendor);
        $this->postJson("/api/vendor/bookings/{$booking->id}/quotations", $revisedPayload)
            ->assertCreated()
            ->assertJsonPath('quotation.version', 2)
            ->assertJsonPath('quotation.total_amount', 1000);

        Sanctum::actingAs($this->customer);
        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonCount(2, 'bookings.0.quotation_history')
            ->assertJsonPath('bookings.0.quotation_history.0.version', 2)
            ->assertJsonPath('bookings.0.quotation_history.1.status', 'revision_requested')
            ->assertJsonPath('bookings.0.quotation_history.1.response_note', $reason);
    }

    public function test_acceptance_confirms_booking_and_locks_agreed_total(): void
    {
        $booking = $this->booking();
        $quotation = $this->sendQuotation($booking);

        Sanctum::actingAs($this->customer);
        $this->patchJson("/api/bookings/{$booking->id}/quotations/{$quotation->id}/accept")
            ->assertOk()
            ->assertJsonPath('status', 'confirmed')
            ->assertJsonPath('quotation.status', 'accepted');

        $booking->refresh();
        $this->assertSame('confirmed', $booking->status);
        $this->assertSame('1836.00', $booking->price_snapshot);
        $this->assertSame('quoted package', $booking->pricing_unit_snapshot);
        $this->assertNotNull($booking->confirmed_at);
        $this->assertNull($booking->expires_at);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'quotation_accepted',
        ]);

        $this->patchJson("/api/bookings/{$booking->id}/quotations/{$quotation->id}/accept")
            ->assertNotFound();
    }

    public function test_declining_quotation_closes_request_and_releases_date(): void
    {
        $booking = $this->booking();
        $quotation = $this->sendQuotation($booking);
        $reason = 'The final amount is outside the approved event budget.';

        Sanctum::actingAs($this->customer);
        $this->patchJson("/api/bookings/{$booking->id}/quotations/{$quotation->id}/decline", [
            'reason' => $reason,
        ])
            ->assertOk()
            ->assertJsonPath('status', 'cancelled')
            ->assertJsonPath('quotation.status', 'declined');

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertSame('customer', $booking->cancelled_by);
        $this->assertStringContainsString($reason, $booking->cancellation_reason);
        $this->assertTrue(ServiceAvailability::where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $booking->selected_date)
            ->exists());
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'quotation_declined',
        ]);
    }

    public function test_organizer_cancellation_withdraws_active_quotation(): void
    {
        $booking = $this->booking();
        $quotation = $this->sendQuotation($booking);

        Sanctum::actingAs($this->customer);
        $this->patchJson("/api/bookings/{$booking->id}/cancel")
            ->assertOk();

        $quotation->refresh();
        $this->assertSame('withdrawn', $quotation->status);
        $this->assertNotNull($quotation->responded_at);
        $this->assertSame('The organizer cancelled the booking request.', $quotation->response_note);
    }

    public function test_quotation_expiry_notifies_both_parties_and_releases_date(): void
    {
        $booking = $this->booking();
        $payload = $this->quotationPayload();
        $payload['valid_until'] = now()->toDateString();
        $quotation = $this->sendQuotation($booking, $payload);

        Carbon::setTestNow('2026-07-17 00:00:01');
        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Expired booking requests: 1')
            ->assertSuccessful();

        $this->assertSame('expired', $booking->refresh()->status);
        $this->assertSame('expired', $quotation->refresh()->status);
        $this->assertNotNull($quotation->expired_at);
        $this->assertTrue(ServiceAvailability::where('service_profile_id', $this->service->id)
            ->whereDate('available_date', $booking->selected_date)
            ->exists());

        foreach ([$this->customer, $this->vendor] as $recipient) {
            $this->assertDatabaseHas('user_notifications', [
                'user_id' => $recipient->id,
                'booking_id' => $booking->id,
                'type' => 'quotation_expired',
            ]);
        }
    }

    public function test_quotation_deadline_reminder_goes_to_organizer_only_once(): void
    {
        $booking = $this->booking();
        $payload = $this->quotationPayload();
        $payload['valid_until'] = now()->toDateString();
        $this->sendQuotation($booking, $payload);

        Carbon::setTestNow('2026-07-16 13:00:00');
        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Response reminders sent: 1')
            ->assertSuccessful();
        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Response reminders sent: 0')
            ->assertSuccessful();

        $this->assertSame(1, DB::table('user_notifications')->where([
            'user_id' => $this->customer->id,
            'booking_id' => $booking->id,
            'type' => 'quotation_expiry_reminder',
        ])->count());
        $this->assertDatabaseMissing('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_expiry_reminder',
        ]);
    }

    public function test_quotation_authorization_and_business_validation_are_enforced(): void
    {
        $booking = $this->booking();
        $otherVendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);

        Sanctum::actingAs($otherVendor);
        $this->postJson("/api/vendor/bookings/{$booking->id}/quotations", $this->quotationPayload())
            ->assertNotFound();

        Sanctum::actingAs($this->vendor);
        $invalid = $this->quotationPayload();
        $invalid['discount_amount'] = 5000;
        $this->postJson("/api/vendor/bookings/{$booking->id}/quotations", $invalid)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('discount_amount');

        $invalid = $this->quotationPayload();
        $invalid['valid_until'] = $booking->selected_date->addDay()->toDateString();
        $this->postJson("/api/vendor/bookings/{$booking->id}/quotations", $invalid)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('valid_until');

        $quotation = $this->sendQuotation($booking);
        $otherCustomer = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($otherCustomer);
        $this->patchJson("/api/bookings/{$booking->id}/quotations/{$quotation->id}/accept")
            ->assertNotFound();
    }

    public function test_related_parties_and_administrators_can_download_versioned_quotation_pdf(): void
    {
        $booking = $this->booking();
        $quotation = $this->sendQuotation($booking);
        $url = "/api/bookings/{$booking->id}/quotations/{$quotation->id}/pdf";
        $filename = $quotation->reference().'.pdf';

        foreach ([
            $this->customer,
            $this->vendor,
            User::factory()->create(['role' => 'admin']),
            User::factory()->create(['role' => 'super_admin']),
        ] as $user) {
            Sanctum::actingAs($user);
            $response = $this->get($url)
                ->assertOk()
                ->assertHeader('content-type', 'application/pdf')
                ->assertDownload($filename);

            $this->assertStringStartsWith('%PDF-', (string) $response->getContent());
        }

        Sanctum::actingAs(User::factory()->create(['role' => 'user']));
        $this->get($url)->assertNotFound();

        Sanctum::actingAs(User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]));
        $this->get($url)->assertNotFound();
    }

    public function test_quotation_activity_queues_resend_email_when_enabled(): void
    {
        config()->set([
            'acara.booking_email.enabled' => true,
            'acara.booking_email.mailer' => 'resend',
            'acara.booking_email.queue_connection' => 'database',
            'acara.booking_email.queue' => 'emails',
        ]);
        Notification::fake();
        $booking = $this->booking();

        $this->sendQuotation($booking);

        Notification::assertSentTo(
            $this->customer,
            BookingActivityEmail::class,
            fn (BookingActivityEmail $notification): bool => $notification->activity->booking_id === $booking->id
                && $notification->activity->type === 'quotation_sent'
                && $notification->connection === 'database'
                && $notification->queue === 'emails'
                && $notification->afterCommit === true,
        );
    }

    private function booking(): Booking
    {
        return Booking::create([
            'user_id' => $this->customer->id,
            'service_profile_id' => $this->service->id,
            'service_name_snapshot' => $this->service->service_name,
            'vendor_name_snapshot' => 'Farah Event Works',
            'price_snapshot' => $this->service->pricing_starting_from,
            'pricing_unit_snapshot' => $this->service->pricing_unit,
            'selected_date' => now()->addDays(10)->toDateString(),
            'status' => 'pending',
            'expires_at' => now()->addHours(48),
        ]);
    }

    private function sendQuotation(Booking $booking, ?array $payload = null): Quotation
    {
        Sanctum::actingAs($this->vendor);
        $this->postJson("/api/vendor/bookings/{$booking->id}/quotations", $payload ?? $this->quotationPayload())
            ->assertCreated();

        return Quotation::where('booking_id', $booking->id)->latest('version')->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function quotationPayload(): array
    {
        return [
            'items' => [
                [
                    'description' => 'Production crew and equipment',
                    'quantity' => 2,
                    'unit_price' => 500,
                ],
                [
                    'description' => 'Sound system and technician',
                    'quantity' => 1,
                    'unit_price' => 800,
                ],
            ],
            'discount_amount' => 100,
            'tax_rate' => 8,
            'terms' => 'A final production schedule must be provided seven days before the event.',
            'vendor_notes' => 'Package includes setup and teardown.',
            'valid_until' => now()->addDays(2)->toDateString(),
        ];
    }
}
