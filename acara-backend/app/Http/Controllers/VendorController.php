<?php

namespace App\Http\Controllers;

use App\Models\VendorProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class VendorController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ssm_number' => 'nullable|string|max:255',
            'ssm_document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'business_name' => 'required|string|max:255',
            'business_link' => 'required|string|max:500',
            'years_of_experience' => 'required|integer|min:0|max:100',
            'service_area_state' => 'required|string|max:255',
            'service_area_town' => 'required|string|max:255',
            'bank_name' => 'required|string|max:255',
            'bank_account_number' => 'required|string|max:255',
            'bank_holder_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $timestamp = now()->format('Ymd_His');
            $slugName = Str::slug($request->business_name);

            $ssmDocumentPath = null;
            if ($request->hasFile('ssm_document')) {
                $extension = $request->file('ssm_document')->getClientOriginalExtension();
                $filename = "{$slugName}_ssm_{$timestamp}.{$extension}";
                $ssmDocumentPath = $request->file('ssm_document')->storeAs('vendor_ssm_documents', $filename, 'public');
            }

            $vendorProfile = VendorProfile::updateOrCreate(
                ['user_id' => $request->user()->id],
                [
                    'ssm_number' => $request->ssm_number,
                    'ssm_document_path' => $ssmDocumentPath,
                    'business_name' => $request->business_name,
                    'business_link' => $request->business_link,
                    'years_of_experience' => $request->years_of_experience,
                    'service_area_state' => $request->service_area_state,
                    'service_area_town' => $request->service_area_town,
                    'bank_name' => $request->bank_name,
                    'bank_account_number' => $request->bank_account_number,
                    'bank_holder_name' => $request->bank_holder_name,
                    'status' => 'pending_verification',
                ]
            );

            return response()->json([
                'message' => 'Vendor business details submitted successfully',
                'data' => $vendorProfile,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create vendor profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
