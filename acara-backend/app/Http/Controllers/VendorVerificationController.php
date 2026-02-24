<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
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
                    'vendor_category' => $vendor->vendor_category,
                    'service_area' => $vendor->service_area,
                    'pricing_starting_from' => $vendor->pricing_starting_from,
                    'pricing_unit' => $vendor->pricing_unit,
                    'status' => $vendor->status,
                    'submitted_at' => $vendor->created_at->format('Y-m-d h:i A'),
                    'portfolio_url' => $vendor->portfolio_path
                        ? asset('storage/' . $vendor->portfolio_path)
                        : null,
                    'verification_url' => $vendor->verification_documents_path
                        ? asset('storage/' . $vendor->verification_documents_path)
                        : null,
                ];
            });

        return response()->json($vendors);
    }

    public function approve($id)
    {
        $vendor = VendorProfile::findOrFail($id);

        if ($vendor->status !== 'pending_verification') {
            return response()->json([
                'message' => 'Vendor already processed'
            ], 400);
        }

        $vendor->status = 'approved';
        $vendor->save();

        return response()->json([
            'message' => 'Vendor approved successfully'
        ]);
    }

    public function reject($id)
    {
        $vendor = VendorProfile::findOrFail($id);

        if ($vendor->status !== 'pending_verification') {
            return response()->json([
                'message' => 'Vendor already processed'
            ], 400);
        }

        $vendor->status = 'rejected';
        $vendor->save();

        return response()->json([
            'message' => 'Vendor rejected successfully'
        ]);
    }
}