<?php

namespace App\Http\Controllers;

use App\Models\VendorProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class VendorController extends Controller
{
    public function show(Request $request)
    {
        $vendorProfile = VendorProfile::where('user_id', $request->user()->id)
            ->latest('id')
            ->first();

        if (! $vendorProfile) {
            return response()->json(['profile' => null]);
        }

        return response()->json([
            'profile' => [
                'id' => $vendorProfile->id,
                'business_name' => $vendorProfile->business_name,
                'ssm_number' => $vendorProfile->ssm_number,
                'business_link' => $vendorProfile->business_link,
                'business_started_at' => $vendorProfile->business_started_at,
                'service_area_state' => $vendorProfile->service_area_state,
                'service_area_town' => $vendorProfile->service_area_town,
                'bank_name' => $vendorProfile->bank_name,
                'bank_account_number' => $vendorProfile->bank_account_number,
                'bank_holder_name' => $vendorProfile->bank_holder_name,
                'status' => $vendorProfile->status,
                'ssm_document_url' => $vendorProfile->ssm_document_path
                    ? asset('storage/' . ltrim($vendorProfile->ssm_document_path, '/'))
                    : null,
                'updated_at' => $vendorProfile->updated_at?->toDateTimeString(),
            ],
        ]);
    }

    public function status(Request $request)
    {
        $vendorProfile = VendorProfile::where('user_id', $request->user()->id)
            ->latest('id')
            ->first();

        return response()->json([
            'profile_exists' => (bool) $vendorProfile,
            'status' => $vendorProfile?->status,
            'business_name' => $vendorProfile?->business_name,
            'can_register_services' => $vendorProfile?->status === 'approved',
        ]);
    }

    public function store(Request $request)
    {
        $existingProfile = VendorProfile::where('user_id', $request->user()->id)->first();

        $validator = Validator::make($request->all(), [
            'ssm_number' => 'nullable|string|max:255',
            'ssm_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'business_name' => 'required|string|max:255',
            'business_link' => 'required|string|max:500',
            'business_started_at' => 'required|date|before_or_equal:today',
            'service_area_state' => 'required|string|max:255',
            'service_area_town' => 'required|string|max:255',
            'bank_name' => 'required|string|max:255',
            'bank_account_number' => 'required|string|max:255',
            'bank_holder_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (! $existingProfile && ! $request->hasFile('ssm_document')) {
            return response()->json([
                'message' => 'An SSM document is required for a new company profile.',
                'errors' => ['ssm_document' => ['The SSM document field is required.']],
            ], 422);
        }

        try {
            $timestamp = now()->format('Ymd_His');
            $slugName = Str::slug($request->business_name);

            $oldSsmDocumentPath = $existingProfile?->ssm_document_path;
            $ssmDocumentPath = $oldSsmDocumentPath;
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
                    'business_started_at' => $request->business_started_at,
                    'service_area_state' => $request->service_area_state,
                    'service_area_town' => $request->service_area_town,
                    'bank_name' => $request->bank_name,
                    'bank_account_number' => $request->bank_account_number,
                    'bank_holder_name' => $request->bank_holder_name,
                    'status' => 'pending_verification',
                ]
            );

            if ($oldSsmDocumentPath && $oldSsmDocumentPath !== $ssmDocumentPath) {
                Storage::disk('public')->delete($oldSsmDocumentPath);
            }

            return response()->json([
                'message' => $existingProfile
                    ? 'Company profile updated and submitted for verification.'
                    : 'Company profile submitted successfully.',
                'data' => $vendorProfile,
            ], $existingProfile ? 200 : 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create vendor profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
