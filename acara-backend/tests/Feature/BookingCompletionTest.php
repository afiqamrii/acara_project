<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingCompletion;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Models\UserNotification;
use App\Notifications\BookingActivityEmail;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingCompletionTest extends TestCase
{
    use RefreshDatabase;

    private User $vendor;

    private User $organizer;

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
        $this->organizer = User::factory()->create([
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
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_vendor_submits_completion_note_and_optional_proof_for_organizer_review(): void
    {
        Storage::fake('public');
        $booking = $this->booking();

        Sanctum::actingAs($this->vendor);
        $response = $this->post("/api/vendor/bookings/{$booking->id}/completion", [
            'note' => 'Photography coverage and edited image delivery were completed.',
            'proof' => UploadedFile::fake()->image('delivery-proof.jpg'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'completion_pending')
            ->assertJsonPath('completion.status', 'pending')
            ->assertJsonPath('completion.proof_name', 'delivery-proof.jpg');

        $completion = BookingCompletion::firstOrFail();
        $this->assertSame('confirmed', $booking->refresh()->status);
        $this->assertSame('completion_pending', $booking->completion_status);
        $this->assertNotNull($completion->response_due_at);
        Storage::disk('public')->assertExists($completion->proof_path);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->organizer->id,
            'booking_id' => $booking->id,
            'type' => 'completion_submitted',
        ]);
    }

    public function test_completion_cannot_be_submitted_early_or_by_another_vendor(): void
    {
        $futureBooking = $this->booking(now()->addDay()->toDateString());

        Sanctum::actingAs($this->vendor);
        $this->postJson("/api/vendor/bookings/{$futureBooking->id}/completion", [
            'note' => 'This attempt is too early for the confirmed event date.',
        ])->assertUnprocessable();

        $otherVendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        Sanctum::actingAs($otherVendor);
        $this->postJson("/api/vendor/bookings/{$futureBooking->id}/completion", [
            'note' => 'This vendor does not own the service attached to the booking.',
        ])->assertNotFound();

        $this->assertSame('confirmed', $futureBooking->refresh()->status);
        $this->assertDatabaseCount('booking_completions', 0);
    }

    public function test_organizer_confirmation_completes_booking_and_unlocks_review(): void
    {
        $booking = $this->submitCompletion();

        Sanctum::actingAs($this->organizer);
        $this->patchJson("/api/bookings/{$booking->id}/completion/confirm")
            ->assertOk()
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('completion.status', 'confirmed');

        $this->assertSame('completed', $booking->refresh()->status);
        $this->assertNotNull($booking->completed_at);
        $this->assertSame('confirmed', BookingCompletion::firstOrFail()->status);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'completion_confirmed',
        ]);

        $this->getJson('/api/reviews')
            ->assertOk()
            ->assertJsonPath('summary.awaiting_review', 1);
    }

    public function test_organizer_dispute_is_sent_to_vendor_and_admin_for_resolution(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $booking = $this->submitCompletion();

        Sanctum::actingAs($this->organizer);
        $this->patchJson("/api/bookings/{$booking->id}/completion/dispute", [
            'reason' => 'The final edited photo collection has not been delivered yet.',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'completion_disputed');

        $this->assertSame('confirmed', $booking->refresh()->status);
        $this->assertSame('completion_disputed', $booking->completion_status);
        $this->assertSame('disputed', BookingCompletion::firstOrFail()->status);
        foreach ([$this->vendor, $admin] as $recipient) {
            $this->assertDatabaseHas('user_notifications', [
                'user_id' => $recipient->id,
                'booking_id' => $booking->id,
                'type' => 'completion_disputed',
            ]);
        }

        $this->postJson("/api/bookings/{$booking->id}/review", [
            'rating' => 2,
            'comment' => 'A disputed completion must not be reviewable yet.',
        ])->assertUnprocessable();
    }

    public function test_admin_can_complete_or_reopen_a_disputed_completion(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $booking = $this->submitCompletion();
        $this->dispute($booking);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/bookings/{$booking->id}/completion/resolve", [
            'decision' => 'reopen',
            'reason' => 'The vendor must provide the outstanding edited photo collection.',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');

        $this->assertSame('confirmed', $booking->refresh()->status);
        $this->assertSame('resolved_reopened', BookingCompletion::firstOrFail()->status);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'module' => 'bookings',
            'action' => 'completion_resolved',
            'subject_id' => $booking->id,
        ]);

        Sanctum::actingAs($this->vendor);
        $this->postJson("/api/vendor/bookings/{$booking->id}/completion", [
            'note' => 'The edited collection has now been delivered to the organizer.',
        ])->assertCreated();
        $this->assertDatabaseCount('booking_completions', 2);

        $this->dispute($booking);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/bookings/{$booking->id}/completion/resolve", [
            'decision' => 'complete',
            'reason' => 'Delivery evidence confirms that the full service is now complete.',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'completed');

        $this->assertSame('completed', $booking->refresh()->status);
        $this->assertNotNull($booking->completed_at);
        $this->assertSame(2, \App\Models\AdminAuditLog::where([
            'actor_id' => $admin->id,
            'module' => 'bookings',
            'action' => 'completion_resolved',
            'subject_id' => $booking->id,
        ])->count());
    }

    public function test_lifecycle_reminds_organizer_then_auto_confirms_once(): void
    {
        config([
            'acara.booking_completion.response_hours' => 72,
            'acara.booking_completion.reminder_hours_before_expiry' => 24,
        ]);
        $booking = $this->submitCompletion();

        Carbon::setTestNow('2026-07-18 11:00:00');
        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Completion reminders sent: 1')
            ->assertSuccessful();
        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Completion reminders sent: 0')
            ->assertSuccessful();

        $this->assertSame(1, UserNotification::where([
            'user_id' => $this->organizer->id,
            'booking_id' => $booking->id,
            'type' => 'completion_response_reminder',
        ])->count());

        Carbon::setTestNow('2026-07-19 10:00:01');
        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Completions confirmed automatically: 1')
            ->assertSuccessful();
        $this->artisan('bookings:process-lifecycle')
            ->expectsOutput('Completions confirmed automatically: 0')
            ->assertSuccessful();

        $this->assertSame('completed', $booking->refresh()->status);
        $this->assertSame('auto_confirmed', BookingCompletion::firstOrFail()->status);
        $this->assertSame(2, UserNotification::where([
            'booking_id' => $booking->id,
            'type' => 'completion_auto_confirmed',
        ])->count());
    }

    public function test_completion_submission_and_confirmation_queue_email_notifications(): void
    {
        Notification::fake();
        config(['acara.booking_email.enabled' => true]);
        $booking = $this->submitCompletion();

        Notification::assertSentTo(
            $this->organizer,
            BookingActivityEmail::class,
            fn (BookingActivityEmail $notification) => $notification->activity->type === 'completion_submitted'
        );

        Sanctum::actingAs($this->organizer);
        $this->patchJson("/api/bookings/{$booking->id}/completion/confirm")->assertOk();

        Notification::assertSentTo(
            $this->vendor,
            BookingActivityEmail::class,
            fn (BookingActivityEmail $notification) => $notification->activity->type === 'completion_confirmed'
        );
    }

    private function booking(?string $selectedDate = null): Booking
    {
        return Booking::create([
            'user_id' => $this->organizer->id,
            'service_profile_id' => $this->service->id,
            'service_name_snapshot' => $this->service->service_name,
            'vendor_name_snapshot' => $this->vendor->name,
            'price_snapshot' => 1800,
            'pricing_unit_snapshot' => 'event',
            'selected_date' => $selectedDate ?? today()->toDateString(),
            'status' => 'confirmed',
            'confirmed_at' => now()->subDay(),
        ]);
    }

    private function submitCompletion(): Booking
    {
        $booking = $this->booking();
        Sanctum::actingAs($this->vendor);
        $this->postJson("/api/vendor/bookings/{$booking->id}/completion", [
            'note' => 'The full photography service and agreed delivery were completed.',
        ])->assertCreated();

        return $booking;
    }

    private function dispute(Booking $booking): void
    {
        Sanctum::actingAs($this->organizer);
        $this->patchJson("/api/bookings/{$booking->id}/completion/dispute", [
            'reason' => 'The organizer requires administrator review of the final delivery.',
        ])->assertOk();
    }
}
