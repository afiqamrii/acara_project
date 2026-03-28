<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\VendorProfile;

class VendorVerificationController extends Controller
{
    public function index()
    {
        $vendors = VendorProfile::with('user')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($vendor) {
                return [
                    'id' => $vendor->id,
                    'business_name' => $vendor->business_name,
                    'ssm_number' => $vendor->ssm_number,
                    'business_link' => $vendor->business_link,
                    'years_of_experience' => $vendor->years_of_experience,
                    'status' => $vendor->status,
                    'submitted_at' => $vendor->created_at->format('Y-m-d h:i A'),
                    'ssm_document_url' => $vendor->ssm_document_path
                        ? asset('storage/' . $vendor->ssm_document_path)
                        : null,
                ];
            });

        return response()->json($vendors);
    }

    public function approve($id)
    {
        $vendor = VendorProfile::findOrFail($id);

        if (!in_array($vendor->status, ['pending_verification', 'pending_completion'], true)) {
            return response()->json([
                'message' => 'Vendor already processed',
            ], 400);
        }

        $vendor->status = 'approved';
        $vendor->save();

        return response()->json([
            'message' => 'Vendor approved successfully',
        ]);
    }

    public function reject($id)
    {
        $vendor = VendorProfile::findOrFail($id);

        if (!in_array($vendor->status, ['pending_verification', 'pending_completion'], true)) {
            return response()->json([
                'message' => 'Vendor already processed',
            ], 400);
        }

        $vendor->status = 'rejected';
        $vendor->save();

        return response()->json([
            'message' => 'Vendor rejected successfully',
        ]);
    }
}
