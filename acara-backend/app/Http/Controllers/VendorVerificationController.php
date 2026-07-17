<?php

namespace App\Http\Controllers;

use App\Models\VendorProfile;
use App\Services\AdminAuditService;
use Illuminate\Http\Request;

class VendorVerificationController extends Controller
{
    public function __construct(private readonly AdminAuditService $audits) {}

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
                        ? asset('storage/'.$vendor->ssm_document_path)
                        : null,
                ];
            });

        return response()->json($vendors);
    }

    public function approve(Request $request, $id)
    {
        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);
        $vendor = VendorProfile::findOrFail($id);

        if (! in_array($vendor->status, ['pending_verification', 'pending_completion'], true)) {
            return response()->json([
                'message' => 'Vendor already processed',
            ], 400);
        }

        $previousStatus = $vendor->status;
        $vendor->status = 'approved';
        $vendor->save();
        $note = trim($validated['admin_note'] ?? '') ?: null;
        $this->audits->record(
            request: $request,
            module: 'vendors',
            action: 'vendor_approved',
            description: "Approved vendor verification for {$vendor->business_name}.",
            subjectLabel: $vendor->business_name,
            subjectReference: 'VEN-'.str_pad((string) $vendor->id, 6, '0', STR_PAD_LEFT),
            subject: $vendor,
            before: ['status' => $previousStatus],
            after: ['status' => 'approved'],
            reason: $note,
            metadata: ['vendor_user_id' => $vendor->user_id],
        );

        return response()->json([
            'message' => 'Vendor approved successfully',
        ]);
    }

    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);
        $vendor = VendorProfile::findOrFail($id);

        if (! in_array($vendor->status, ['pending_verification', 'pending_completion'], true)) {
            return response()->json([
                'message' => 'Vendor already processed',
            ], 400);
        }

        $previousStatus = $vendor->status;
        $vendor->status = 'rejected';
        $vendor->save();
        $note = trim($validated['admin_note'] ?? '') ?: null;
        $this->audits->record(
            request: $request,
            module: 'vendors',
            action: 'vendor_rejected',
            description: "Rejected vendor verification for {$vendor->business_name}.",
            subjectLabel: $vendor->business_name,
            subjectReference: 'VEN-'.str_pad((string) $vendor->id, 6, '0', STR_PAD_LEFT),
            subject: $vendor,
            before: ['status' => $previousStatus],
            after: ['status' => 'rejected'],
            reason: $note,
            metadata: ['vendor_user_id' => $vendor->user_id],
        );

        return response()->json([
            'message' => 'Vendor rejected successfully',
        ]);
    }
}
