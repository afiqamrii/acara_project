<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use LogicException;
use Tests\TestCase;

class AdminAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_filter_platform_logs_and_open_full_request_context(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $admin = User::factory()->create(['role' => 'admin', 'name' => 'Review Admin']);
        $firstUser = User::factory()->create(['role' => 'user', 'name' => 'First Member']);
        $secondUser = User::factory()->create(['role' => 'vendor', 'name' => 'Second Member']);

        Sanctum::actingAs($admin);
        $this->withServerVariables([
            'REMOTE_ADDR' => '203.0.113.42',
            'HTTP_USER_AGENT' => 'ACARA Audit Test Browser',
        ])->patchJson("/api/admin/users/{$firstUser->id}/suspend", [
            'reason' => 'This account requires review following repeated policy violations.',
        ])->assertOk();

        Sanctum::actingAs($superAdmin);
        $this->patchJson("/api/admin/users/{$secondUser->id}/suspend", [
            'reason' => 'The vendor account requires a temporary compliance review.',
        ])->assertOk();

        $adminLog = AdminAuditLog::where('actor_id', $admin->id)->firstOrFail();

        $this->getJson("/api/admin/audit-logs?action=user_suspended&actor_id={$admin->id}")
            ->assertOk()
            ->assertJsonPath('scope', 'platform')
            ->assertJsonCount(1, 'logs')
            ->assertJsonPath('logs.0.id', $adminLog->id)
            ->assertJsonPath('logs.0.actor.name', 'Review Admin')
            ->assertJsonPath('stats.total', 2)
            ->assertJsonPath('stats.high_impact', 2);

        $this->getJson("/api/admin/audit-logs/{$adminLog->id}")
            ->assertOk()
            ->assertJsonPath('log.reference', 'AUD-'.str_pad((string) $adminLog->id, 7, '0', STR_PAD_LEFT))
            ->assertJsonPath('log.module', 'users')
            ->assertJsonPath('log.before_values.status', 'active')
            ->assertJsonPath('log.after_values.status', 'suspended')
            ->assertJsonPath('log.metadata.request_method', 'PATCH')
            ->assertJsonPath('log.ip_address', '203.0.113.42')
            ->assertJsonPath('log.user_agent', 'ACARA Audit Test Browser');
    }

    public function test_regular_admin_can_only_see_their_own_audit_records(): void
    {
        $firstAdmin = User::factory()->create(['role' => 'admin']);
        $secondAdmin = User::factory()->create(['role' => 'admin']);
        $firstUser = User::factory()->create(['role' => 'user']);
        $secondUser = User::factory()->create(['role' => 'user']);

        Sanctum::actingAs($firstAdmin);
        $this->patchJson("/api/admin/users/{$firstUser->id}/suspend", [
            'reason' => 'The first administrator documented this moderation decision.',
        ])->assertOk();

        Sanctum::actingAs($secondAdmin);
        $this->patchJson("/api/admin/users/{$secondUser->id}/suspend", [
            'reason' => 'The second administrator documented this separate decision.',
        ])->assertOk();
        $secondLog = AdminAuditLog::where('actor_id', $secondAdmin->id)->firstOrFail();

        Sanctum::actingAs($firstAdmin);
        $this->getJson('/api/admin/audit-logs')
            ->assertOk()
            ->assertJsonPath('scope', 'own')
            ->assertJsonCount(1, 'logs')
            ->assertJsonPath('stats.total', 1)
            ->assertJsonCount(0, 'filters.actors');
        $this->getJson("/api/admin/audit-logs/{$secondLog->id}")->assertNotFound();
    }

    public function test_admin_invitation_creates_a_safe_audit_record(): void
    {
        Notification::fake();
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        Sanctum::actingAs($superAdmin);

        $this->postJson('/api/admin/invite', [
            'email' => 'new.admin@example.test',
        ])->assertCreated();

        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $superAdmin->id,
            'module' => 'administration',
            'action' => 'admin_invited',
            'subject_label' => 'new.admin@example.test',
        ]);
        $log = AdminAuditLog::firstOrFail();
        $this->assertSame('admin', $log->after_values['role']);
        $this->assertArrayNotHasKey('password', $log->after_values);
    }

    public function test_audit_records_cannot_be_updated_or_deleted_through_the_model(): void
    {
        $log = AdminAuditLog::create([
            'module' => 'users',
            'action' => 'test_action',
            'subject_label' => 'Immutable record',
            'description' => 'A test audit event.',
        ]);

        try {
            $log->update(['description' => 'Changed']);
            $this->fail('Updating an audit record should throw an exception.');
        } catch (LogicException $exception) {
            $this->assertSame('Audit records are immutable.', $exception->getMessage());
        }

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Audit records are immutable.');
        $log->delete();
    }
}
