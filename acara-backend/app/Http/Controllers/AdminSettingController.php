<?php

namespace App\Http\Controllers;

use App\Services\AdminAuditService;
use App\Services\PlatformSettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSettingController extends Controller
{
    public function __construct(
        private readonly PlatformSettingService $settings,
        private readonly AdminAuditService $audits,
    ) {}

    public function show(): JsonResponse
    {
        return response()->json($this->payload());
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            PlatformSettingService::BOOKING_RESPONSE_HOURS => ['required', 'integer', 'min:2', 'max:168'],
            PlatformSettingService::BOOKING_REMINDER_HOURS => ['required', 'integer', 'min:1', 'lt:booking_response_hours'],
            PlatformSettingService::COMPLETION_RESPONSE_HOURS => ['required', 'integer', 'min:2', 'max:336'],
            PlatformSettingService::COMPLETION_REMINDER_HOURS => ['required', 'integer', 'min:1', 'lt:completion_response_hours'],
            PlatformSettingService::BOOKING_EMAIL_ENABLED => ['required', 'boolean'],
            'change_reason' => ['required', 'string', 'min:10', 'max:500'],
        ]);

        $values = collect($validated)->only(array_keys($this->settings->defaults()))->all();
        $before = $this->settings->values();

        $changed = DB::transaction(function () use ($request, $validated, $values, $before): array {
            $changed = $this->settings->updateValues($values, $request->user()->id);

            if ($changed !== []) {
                $this->audits->record(
                    request: $request,
                    module: 'settings',
                    action: 'platform_settings_updated',
                    description: 'Updated ACARA booking lifecycle and notification configuration.',
                    subjectLabel: 'Platform configuration',
                    subjectReference: 'CONFIG-PLATFORM',
                    before: $before,
                    after: $this->settings->values(),
                    reason: trim($validated['change_reason']),
                    metadata: ['changed_keys' => $changed],
                );
            }

            return $changed;
        });

        return response()->json(array_merge($this->payload(), [
            'message' => $changed === []
                ? 'No platform setting changes were detected.'
                : 'Platform settings saved successfully.',
            'changed_keys' => $changed,
        ]));
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'settings' => $this->settings->values(),
            'defaults' => $this->settings->defaults(),
            'metadata' => $this->settings->metadata(),
            'constraints' => [
                PlatformSettingService::BOOKING_RESPONSE_HOURS => ['min' => 2, 'max' => 168],
                PlatformSettingService::BOOKING_REMINDER_HOURS => ['min' => 1, 'must_be_less_than' => PlatformSettingService::BOOKING_RESPONSE_HOURS],
                PlatformSettingService::COMPLETION_RESPONSE_HOURS => ['min' => 2, 'max' => 336],
                PlatformSettingService::COMPLETION_REMINDER_HOURS => ['min' => 1, 'must_be_less_than' => PlatformSettingService::COMPLETION_RESPONSE_HOURS],
            ],
            'security_notice' => 'Password recovery and mandatory account security emails are not controlled by this setting.',
            'generated_at' => now()->toDateTimeString(),
        ];
    }
}
