<?php

namespace App\Http\Controllers;

use App\Models\ServiceProfile;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ServiceVerificationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index()
    {
        $services = ServiceProfile::with('user')
            ->orderByRaw("CASE WHEN status = 'pending_verification' THEN 0 ELSE 1 END")
            ->orderByDesc('resubmitted_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (ServiceProfile $service) {
                return [
                    'id' => $service->id,
                    'service_name' => $service->service_name,
                    'service_category' => $service->service_category,
                    'service_details' => $service->service_details,
                    'pricing_starting_from' => $service->pricing_starting_from,
                    'pricing_unit' => $service->pricing_unit,
                    'pricing_description' => $service->pricing_description,
                    'status' => $service->status,
                    'is_active' => $service->is_active,
                    'rejection_reason' => $service->rejection_reason,
                    'submitted_at' => ($service->resubmitted_at ?? $service->created_at)->format('Y-m-d h:i A'),
                    'vendor_name' => $service->user?->name,
                    'portfolio_url' => $service->portfolio_path
                        ? asset('storage/'.$service->portfolio_path)
                        : null,
                ];
            });

        return response()->json($services);
    }

    public function approve(int $id)
    {
        $service = ServiceProfile::findOrFail($id);

        if ($service->status !== 'pending_verification') {
            return response()->json([
                'message' => 'Service already processed',
            ], 400);
        }

        $service->update([
            'status' => 'approved',
            'rejection_reason' => null,
            'rejected_at' => null,
        ]);

        Cache::forget('marketplace:service:'.$service->id);
        $this->notifications->serviceApproved($service);

        return response()->json([
            'message' => 'Service approved successfully',
        ]);
    }

    public function reject(Request $request, int $id)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $service = ServiceProfile::findOrFail($id);

        if ($service->status !== 'pending_verification') {
            return response()->json([
                'message' => 'Service already processed',
            ], 400);
        }

        $service->update([
            'status' => 'rejected',
            'rejection_reason' => trim($validated['reason']),
            'rejected_at' => now(),
        ]);

        Cache::forget('marketplace:service:'.$service->id);
        $this->notifications->serviceRejected($service);

        return response()->json([
            'message' => 'Service rejected successfully',
        ]);
    }
}
