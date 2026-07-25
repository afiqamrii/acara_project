<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\VendorProfile;
use App\Services\VendorSsmDocumentStorage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VendorSsmDocumentStorageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('filesystems.ssm_documents_disk', 'private');
        Storage::fake('private');
        Storage::fake('public');
    }

    public function test_vendor_can_open_their_own_private_ssm_document(): void
    {
        [$vendor, $profile] = $this->vendorWithProfile();
        Storage::disk('private')->put($profile->ssm_document_path, 'private ssm document');

        Sanctum::actingAs($vendor);

        $response = $this->get('/api/vendor/profile/ssm-document');

        $response->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString(
            'inline; filename=acara-studio-ssm-document.pdf',
            (string) $response->headers->get('Content-Disposition'),
        );
    }

    public function test_admin_can_review_a_vendor_ssm_document(): void
    {
        [, $profile] = $this->vendorWithProfile();
        Storage::disk('private')->put($profile->ssm_document_path, 'private ssm document');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $response = $this->get("/api/admin/vendors/{$profile->id}/ssm-document");

        $response->assertOk();
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
    }

    public function test_organizer_cannot_open_the_admin_document_endpoint(): void
    {
        [, $profile] = $this->vendorWithProfile();
        Storage::disk('private')->put($profile->ssm_document_path, 'private ssm document');
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson("/api/admin/vendors/{$profile->id}/ssm-document")
            ->assertForbidden();
    }

    public function test_vendor_endpoint_never_accepts_another_vendor_identifier(): void
    {
        [, $otherProfile] = $this->vendorWithProfile();
        Storage::disk('private')->put($otherProfile->ssm_document_path, 'other vendor document');
        $vendorWithoutProfile = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        Sanctum::actingAs($vendorWithoutProfile);

        $this->getJson('/api/vendor/profile/ssm-document')
            ->assertNotFound();
    }

    public function test_missing_storage_object_returns_not_found_instead_of_a_public_url(): void
    {
        [$vendor] = $this->vendorWithProfile();
        Sanctum::actingAs($vendor);

        $this->getJson('/api/vendor/profile/ssm-document')
            ->assertNotFound()
            ->assertJsonPath('message', 'The SSM document is not available in storage.');
    }

    public function test_company_profile_exposes_availability_not_a_public_storage_url(): void
    {
        [$vendor] = $this->vendorWithProfile();
        Sanctum::actingAs($vendor);

        $this->getJson('/api/vendor/profile')
            ->assertOk()
            ->assertJsonPath('profile.ssm_document_available', true)
            ->assertJsonMissingPath('profile.ssm_document_url');
    }

    public function test_new_ssm_upload_is_written_only_to_the_configured_private_disk(): void
    {
        $path = app(VendorSsmDocumentStorage::class)->store(
            UploadedFile::fake()->create('ssm.pdf', 100, 'application/pdf'),
        );

        Storage::disk('private')->assertExists($path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_migration_command_copies_legacy_public_documents_to_private_storage(): void
    {
        $path = 'vendor_ssm_documents/legacy-company.pdf';
        Storage::disk('public')->put($path, 'legacy ssm document');

        $this->artisan('ssm-documents:migrate')
            ->expectsOutputToContain("Copied: {$path}")
            ->expectsOutputToContain('Copied: 1; skipped: 0; failed: 0')
            ->assertSuccessful();

        Storage::disk('private')->assertExists($path);
        Storage::disk('public')->assertExists($path);
    }

    /**
     * @return array{0: User, 1: VendorProfile}
     */
    private function vendorWithProfile(): array
    {
        $vendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $profile = VendorProfile::unguarded(fn () => VendorProfile::create([
            'user_id' => $vendor->id,
            'ssm_number' => '202601234567',
            'ssm_document_path' => 'vendor_ssm_documents/acara-studio.pdf',
            'business_name' => 'Acara Studio',
            'business_link' => 'https://acara.example',
            'years_of_experience' => 2,
            'business_started_at' => now()->subYears(2)->toDateString(),
            'service_area_state' => 'Selangor',
            'service_area_town' => 'Shah Alam',
            'bank_name' => 'Test Bank',
            'bank_account_number' => '1234567890',
            'bank_holder_name' => 'Acara Studio',
            'status' => 'pending_verification',
        ]));

        return [$vendor, $profile];
    }
}
