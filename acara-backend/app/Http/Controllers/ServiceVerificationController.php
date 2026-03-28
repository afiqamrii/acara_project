<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ServiceProfile;

class ServiceVerificationController extends Controller
{
    public function index()
    {
        $services = ServiceProfile::with('user')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($service) {
                return [
                    'id' => $service->id,
                    'service_name' => $service->service_name,
                    'service_category' => $service->service_category,
                    'pricing_starting_from' => $service->pricing_starting_from,
                    'pricing_unit' => $service->pricing_unit,
                    'status' => $service->status,
                    'submitted_at' => $service->created_at->format('Y-m-d h:i A'),
                    'portfolio_url' => $service->portfolio_path
                        ? asset('storage/' . $service->portfolio_path)
                        : null,
                ];
            });

        return response()->json($services);
    }

    public function approve($id)
    {
        $service = ServiceProfile::findOrFail($id);

        if ($service->status !== 'pending_verification') {
            return response()->json([
                'message' => 'Service already processed',
            ], 400);
        }

        $service->status = 'approved';
        $service->save();

        return response()->json([
            'message' => 'Service approved successfully',
        ]);
    }

    public function reject($id)
    {
        $service = ServiceProfile::findOrFail($id);

        if ($service->status !== 'pending_verification') {
            return response()->json([
                'message' => 'Service already processed',
            ], 400);
        }

        $service->status = 'rejected';
        $service->save();

        return response()->json([
            'message' => 'Service rejected successfully',
        ]);
    }
}
