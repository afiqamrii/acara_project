<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Notifications\BookingActivityEmail;
use App\Services\NotificationService;
use App\Services\PlatformSettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_environment_defaults_before_overrides_exist(): void
    {
        config()->set('acara.booking_lifecycle.response_hours', 48);
        config()->set('acara.booking_lifecycle.reminder_hours_before_expiry', 12);
        config()->set('acara.booking_completion.response_hours', 72);
        config()->set('acara.booking_completion.reminder_hours_before_expiry', 24);
        config()->set('acara.booking_email.enabled', false);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonPath('settings.booking_response_hours', 48)
            ->assertJsonPath('settings.booking_reminder_hours', 12)
            ->assertJsonPath('settings.completion_response_hours', 72)
            ->assertJsonPath('settings.completion_reminder_hours', 24)
            ->assertJsonPath('settings.booking_email_enabled', false)
            ->assertJsonPath('metadata.booking_response_hours.source', 'environment_default')
            ->assertJsonPath('metadata.booking_response_hours.updated_by', null)
            ->assertJsonPath(
                'security_notice',
                'Password recovery and mandatory account security emails are not controlled by this setting.',
            );

        $this->assertDatabaseCount('platform_settings', 0);
    }

    public function test_admin_can_save_settings_with_per_setting_editor_metadata_and_audit_history(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'name' => 'Operations Admin',
            'email' => 'operations@example.test',
        ]);
        Sanctum::actingAs($admin);

        $response = $this->putJson('/api/admin/settings', $this->payload([
            'booking_response_hours' => 36,
            'booking_reminder_hours' => 8,
            'completion_response_hours' => 60,
            'completion_reminder_hours' => 18,
            'booking_email_enabled' => true,
        ]));

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Platform settings saved successfully.')
            ->assertJsonPath('settings.booking_response_hours', 36)
            ->assertJsonPath('settings.booking_email_enabled', true)
            ->assertJsonPath('metadata.booking_response_hours.source', 'admin_override')
            ->assertJsonPath('metadata.booking_response_hours.updated_by.name', 'Operations Admin')
            ->assertJsonCount(5, 'changed_keys');

        $this->assertDatabaseCount('platform_settings', 5);
        $this->assertDatabaseHas('platform_settings', [
            'key' => PlatformSettingService::BOOKING_RESPONSE_HOURS,
            'updated_by' => $admin->id,
        ]);

        $settings = app(PlatformSettingService::class);
        $this->assertSame(36, $settings->bookingResponseHours());
        $this->assertSame(8, $settings->bookingReminderHours());
        $this->assertSame(60, $settings->completionResponseHours());
        $this->assertSame(18, $settings->completionReminderHours());
        $this->assertTrue($settings->bookingEmailsEnabled());

        $audit = AdminAuditLog::firstOrFail();
        $this->assertSame('settings', $audit->module);
        $this->assertSame('platform_settings_updated', $audit->action);
        $this->assertSame('CONFIG-PLATFORM', $audit->subject_reference);
        $this->assertSame('Adjust lifecycle timing for the operations pilot.', $audit->reason);
        $this->assertSame(48, $audit->before_values['booking_response_hours']);
        $this->assertSame(36, $audit->after_values['booking_response_hours']);
        $this->assertCount(5, $audit->metadata['changed_keys']);
    }

    public function test_settings_validation_and_admin_authorization_are_enforced(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));
        $this->getJson('/api/admin/settings')->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->putJson('/api/admin/settings', [
            'booking_response_hours' => 12,
            'booking_reminder_hours' => 12,
            'completion_response_hours' => 24,
            'completion_reminder_hours' => 24,
            'booking_email_enabled' => 'yes',
            'change_reason' => 'short',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'booking_reminder_hours',
                'completion_reminder_hours',
                'booking_email_enabled',
                'change_reason',
            ]);

        $this->assertDatabaseCount('platform_settings', 0);
        $this->assertDatabaseCount('admin_audit_logs', 0);
    }

    public function test_email_delivery_setting_controls_optional_booking_email_without_disabling_in_app_activity(): void
    {
        config()->set('acara.booking_email.enabled', false);
        Notification::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        $organizer = User::factory()->create(['role' => 'user', 'name' => 'Aina Organizer']);
        $vendor = User::factory()->create(['role' => 'vendor']);
        $service = ServiceProfile::create([
            'user_id' => $vendor->id,
            'service_name' => 'Corporate Photography',
            'service_category' => 'Photography',
            'service_details' => 'Corporate event photography coverage.',
            'pricing_starting_from' => 1800,
            'pricing_unit' => 'event',
            'status' => 'approved',
        ]);
        $booking = Booking::create([
            'user_id' => $organizer->id,
            'service_profile_id' => $service->id,
            'selected_date' => now()->addWeek()->toDateString(),
            'status' => 'pending',
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($admin);
        $this->putJson('/api/admin/settings', $this->payload([
            'booking_email_enabled' => true,
        ]))->assertOk();

        app(NotificationService::class)->bookingSubmitted($booking);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $vendor->id,
            'booking_id' => $booking->id,
            'type' => 'booking_request',
        ]);
        Notification::assertSentTo($vendor, BookingActivityEmail::class);
    }

    public function test_pausing_optional_email_does_not_suppress_mandatory_account_status_email(): void
    {
        config()->set('acara.booking_email.enabled', false);
        Notification::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);
        UserNotificationPreference::create([
            'user_id' => $user->id,
            ...UserNotificationPreference::DEFAULTS,
            'email_enabled' => false,
        ]);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/users/{$user->id}/suspend", [
            'reason' => 'A security investigation requires temporary account suspension.',
        ])->assertOk();

        Notification::assertSentTo(
            $user,
            BookingActivityEmail::class,
            fn (BookingActivityEmail $notification): bool => $notification->activity->type === 'account_suspended',
        );
    }

    /**
     * @param  array<string, int|bool>  $overrides
     * @return array<string, int|bool|string>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'booking_response_hours' => 48,
            'booking_reminder_hours' => 12,
            'completion_response_hours' => 72,
            'completion_reminder_hours' => 24,
            'booking_email_enabled' => false,
            'change_reason' => 'Adjust lifecycle timing for the operations pilot.',
        ], $overrides);
    }
}
