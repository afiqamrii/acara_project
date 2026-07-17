<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Notifications\BookingActivityEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('acara.booking_email.enabled', false);
    }

    public function test_admin_can_search_filter_and_open_user_records(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'name' => 'Operations Admin']);
        $vendor = User::factory()->create([
            'role' => 'vendor',
            'name' => 'Farah Creative',
            'email' => 'farah@example.test',
            'last_login_at' => now()->subHour(),
        ]);
        $organizer = User::factory()->unverified()->create(['role' => 'user', 'name' => 'Aina Organizer']);
        $service = ServiceProfile::create([
            'user_id' => $vendor->id,
            'service_name' => 'Corporate Photography',
            'service_category' => 'Photography',
            'service_details' => 'Corporate event photography.',
            'pricing_starting_from' => 1800,
            'pricing_unit' => 'event',
            'status' => 'approved',
        ]);
        Booking::create([
            'user_id' => $organizer->id,
            'service_profile_id' => $service->id,
            'service_name_snapshot' => 'Corporate Photography',
            'vendor_name_snapshot' => 'Farah Creative',
            'price_snapshot' => 1800,
            'selected_date' => now()->addWeek()->toDateString(),
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users?search=farah&role=vendor&status=active&verification=verified')
            ->assertOk()
            ->assertJsonCount(1, 'users')
            ->assertJsonPath('users.0.id', $vendor->id)
            ->assertJsonPath('users.0.services_count', 1)
            ->assertJsonPath('users.0.bookings_received_count', 1)
            ->assertJsonPath('stats.total', 3)
            ->assertJsonPath('stats.active', 3)
            ->assertJsonPath('stats.unverified', 1);

        $this->getJson("/api/admin/users/{$vendor->id}")
            ->assertOk()
            ->assertJsonPath('user.email', 'farah@example.test')
            ->assertJsonPath('services.0.name', 'Corporate Photography')
            ->assertJsonPath('booking_summary.received.total', 1)
            ->assertJsonPath('recent_bookings.0.relationship', 'vendor')
            ->assertJsonPath('permissions.can_suspend', true)
            ->assertJsonPath('permissions.can_reactivate', false)
            ->assertJsonMissingPath('user.password');
    }

    public function test_admin_can_suspend_user_revoke_sessions_and_reactivate_with_audit_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user', 'email' => 'member@example.test']);
        $user->createToken('existing-session');

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/users/{$user->id}/suspend", [
            'reason' => 'Repeated misuse of the booking conversation tools.',
        ])
            ->assertOk()
            ->assertJsonPath('user.status', 'suspended');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => 'suspended',
            'suspended_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('user_moderation_actions', [
            'target_user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => 'suspended',
            'previous_status' => 'active',
            'new_status' => 'suspended',
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'type' => 'account_suspended',
        ]);
        $this->assertDatabaseCount('personal_access_tokens', 0);

        Sanctum::actingAs($user->fresh());
        $this->getJson('/api/profile')
            ->assertForbidden()
            ->assertJsonPath('code', 'ACCOUNT_SUSPENDED');
        Auth::forgetGuards();
        Auth::shouldUse('web');
        $this->postJson('/api/login', [
            'email' => 'member@example.test',
            'password' => 'password',
        ])
            ->assertForbidden()
            ->assertJsonPath('code', 'ACCOUNT_SUSPENDED');

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/users/{$user->id}/reactivate", [
            'reason' => 'Account review completed and access may be restored.',
        ])
            ->assertOk()
            ->assertJsonPath('user.status', 'active');

        $this->assertDatabaseHas('user_moderation_actions', [
            'target_user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => 'reactivated',
            'previous_status' => 'suspended',
            'new_status' => 'active',
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'type' => 'account_reactivated',
        ]);

        Auth::forgetGuards();
        Auth::shouldUse('web');
        $this->postJson('/api/login', [
            'email' => 'member@example.test',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('user.status', 'active');
        $this->assertNotNull($user->fresh()->last_login_at);

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonCount(2, 'moderation_history')
            ->assertJsonPath('moderation_history.0.action', 'reactivated')
            ->assertJsonPath('moderation_history.1.action', 'suspended');
    }

    public function test_moderation_requires_a_meaningful_reason_and_valid_transition(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/users/{$user->id}/suspend", ['reason' => 'short'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $this->patchJson("/api/admin/users/{$user->id}/reactivate", [
            'reason' => 'There is no suspension to reactivate yet.',
        ])->assertConflict();

        $this->patchJson("/api/admin/users/{$user->id}/suspend", [
            'reason' => 'A valid moderation reason for this account.',
        ])->assertOk();

        $this->patchJson("/api/admin/users/{$user->id}/suspend", [
            'reason' => 'A duplicate suspension should not be allowed.',
        ])->assertConflict();
    }

    public function test_role_hierarchy_and_self_moderation_protections_are_enforced(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $otherAdmin = User::factory()->create(['role' => 'admin']);
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $otherSuperAdmin = User::factory()->create(['role' => 'super_admin']);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/users/{$admin->id}/suspend", [
            'reason' => 'Self moderation must always be prevented.',
        ])->assertForbidden();
        $this->patchJson("/api/admin/users/{$otherAdmin->id}/suspend", [
            'reason' => 'Regular administrators cannot moderate peers.',
        ])->assertForbidden();
        $this->patchJson("/api/admin/users/{$superAdmin->id}/suspend", [
            'reason' => 'Super administrators must remain protected.',
        ])->assertForbidden();

        Sanctum::actingAs($superAdmin);
        $this->patchJson("/api/admin/users/{$otherAdmin->id}/suspend", [
            'reason' => 'Super administrator approved this account suspension.',
        ])->assertOk();
        $this->patchJson("/api/admin/users/{$otherSuperAdmin->id}/suspend", [
            'reason' => 'Another super administrator remains protected.',
        ])->assertForbidden();
    }

    public function test_account_status_email_is_mandatory_even_when_optional_email_is_paused(): void
    {
        config()->set('acara.booking_email.enabled', true);
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
            'reason' => 'A critical account review requires temporary suspension.',
        ])->assertOk();

        Notification::assertSentTo(
            $user,
            BookingActivityEmail::class,
            fn (BookingActivityEmail $notification): bool => $notification->activity->type === 'account_suspended',
        );
    }
}
