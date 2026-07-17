<?php

namespace App\Http\Controllers;

use App\Models\UserNotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $preferences = UserNotificationPreference::firstOrCreate(
            ['user_id' => $request->user()->id],
            UserNotificationPreference::DEFAULTS,
        );

        return response()->json([
            'preferences' => $preferences->toPreferenceArray(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_enabled' => ['required', 'boolean'],
            'email_booking_updates' => ['required', 'boolean'],
            'email_quotation_updates' => ['required', 'boolean'],
            'email_booking_messages' => ['required', 'boolean'],
            'email_completion_updates' => ['required', 'boolean'],
            'email_review_updates' => ['required', 'boolean'],
            'email_service_updates' => ['required', 'boolean'],
        ]);

        $preferences = UserNotificationPreference::updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated,
        );

        return response()->json([
            'message' => 'Notification preferences saved.',
            'preferences' => $preferences->toPreferenceArray(),
        ]);
    }
}
