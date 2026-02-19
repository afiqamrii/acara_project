<?php

namespace App\Http\Controllers;

use App\Models\VendorProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class VendorController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'business_name' => 'required|string|max:255',
            'vendor_category' => 'required|string|max:255',
            'services_offered' => 'required|string',
            'pricing_starting_from' => 'required|numeric',
            'pricing_unit' => 'required|string',
            'pricing_description' => 'nullable|string',
            'service_area' => 'required|string|max:255',
            'portfolio' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
            'bank_name' => 'required|string|max:255',
            'bank_account_number' => 'required|string|max:255',
            'bank_holder_name' => 'required|string|max:255',
            'verification_documents' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Generate Standardized Filenames
            $timestamp = now()->format('Ymd_His');
            $slugName = \Illuminate\Support\Str::slug($request->business_name);

            // Handle Portfolio Upload
            $portfolioPath = null;
            if ($request->hasFile('portfolio')) {
                $extension = $request->file('portfolio')->getClientOriginalExtension();
                $filename = "{$slugName}_portfolio_{$timestamp}.{$extension}";
                $portfolioPath = $request->file('portfolio')->storeAs('vendor_portfolios', $filename, 'public');
            }

            // Handle Verification Upload
            $verificationPath = null;
            if ($request->hasFile('verification_documents')) {
                $extension = $request->file('verification_documents')->getClientOriginalExtension();
                $filename = "{$slugName}_verification_{$timestamp}.{$extension}";
                $verificationPath = $request->file('verification_documents')->storeAs('vendor_verifications', $filename, 'public');
            }

            $vendorProfile = VendorProfile::create([
                'user_id' => $request->user()->id,
                'business_name' => $request->business_name,
                'vendor_category' => $request->vendor_category,
                'services_offered' => $request->services_offered,
                'pricing_starting_from' => $request->pricing_starting_from,
                'pricing_unit' => $request->pricing_unit,
                'pricing_description' => $request->pricing_description,
                'service_area' => $request->service_area,
                'portfolio_path' => $portfolioPath,
                'bank_name' => $request->bank_name,
                'bank_account_number' => $request->bank_account_number,
                'bank_holder_name' => $request->bank_holder_name,
                'verification_documents_path' => $verificationPath,
                'status' => 'pending_verification',
            ]);

            return response()->json([
                'message' => 'Vendor application submitted successfully',
                'data' => $vendorProfile
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create vendor profile', 'error' => $e->getMessage()], 500);
        }
    }
}
