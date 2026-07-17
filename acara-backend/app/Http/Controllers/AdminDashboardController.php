<?php

namespace App\Http\Controllers;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Models\VendorProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $members = User::query()->whereNotIn('role', ['admin', 'super_admin']);
        $pendingVendors = VendorProfile::query()
            ->whereIn('status', ['pending_verification', 'pending_completion']);
        $pendingServices = ServiceProfile::query()->where('status', 'pending_verification');

        $pendingBookings = Booking::query()->where('status', 'pending');
        $confirmedBookings = Booking::query()->where('status', 'confirmed');
        $needsResolution = Booking::query()->where('completion_status', 'completion_disputed');

        return response()->json([
            'accounts' => [
                'total' => (clone $members)->count(),
                'active' => (clone $members)->where('status', 'active')->count(),
                'suspended' => (clone $members)->where('status', 'suspended')->count(),
                'organizers' => (clone $members)->where('role', 'user')->count(),
                'vendors' => (clone $members)->where('role', 'vendor')->count(),
            ],
            'verifications' => [
                'total' => (clone $pendingVendors)->count() + (clone $pendingServices)->count(),
                'vendors' => (clone $pendingVendors)->count(),
                'services' => (clone $pendingServices)->count(),
            ],
            'bookings' => [
                'active' => (clone $pendingBookings)->count() + (clone $confirmedBookings)->count(),
                'pending_vendor' => (clone $pendingBookings)->count(),
                'confirmed' => (clone $confirmedBookings)->count(),
                'awaiting_organizer' => Booking::where('completion_status', 'completion_pending')->count(),
                'needs_resolution' => (clone $needsResolution)->count(),
                'completed_this_month' => Booking::where('status', 'completed')
                    ->whereBetween('completed_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count(),
            ],
            'queues' => [
                'verifications' => $this->verificationQueue(),
                'bookings' => $this->bookingQueue(),
            ],
            'recent_activity' => $this->recentActivity($request),
            'activity_scope' => $request->user()->role === 'super_admin' ? 'platform' : 'own',
            'generated_at' => now()->toDateTimeString(),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function verificationQueue(): array
    {
        $vendors = VendorProfile::query()
            ->with('user:id,name,email')
            ->whereIn('status', ['pending_verification', 'pending_completion'])
            ->latest('updated_at')
            ->limit(6)
            ->get()
            ->map(fn (VendorProfile $vendor) => [
                'key' => 'vendor-'.$vendor->id,
                'type' => 'vendor',
                'id' => $vendor->id,
                'title' => $vendor->business_name,
                'subtitle' => $vendor->user?->email ?? 'Vendor account',
                'status' => $vendor->status,
                'submitted_at' => $vendor->updated_at->toDateTimeString(),
                'path' => '/admin/verifications/vendors',
            ]);

        $services = ServiceProfile::query()
            ->with('user:id,name,email')
            ->where('status', 'pending_verification')
            ->latest('updated_at')
            ->limit(6)
            ->get()
            ->map(fn (ServiceProfile $service) => [
                'key' => 'service-'.$service->id,
                'type' => 'service',
                'id' => $service->id,
                'title' => $service->service_name,
                'subtitle' => $service->user?->name ?: ($service->user?->email ?? 'Vendor account'),
                'status' => $service->status,
                'submitted_at' => ($service->resubmitted_at ?? $service->updated_at)->toDateTimeString(),
                'path' => '/admin/verifications/services',
            ]);

        return $vendors
            ->concat($services)
            ->sortByDesc('submitted_at')
            ->take(6)
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function bookingQueue(): array
    {
        return Booking::query()
            ->with([
                'user:id,name,email',
                'serviceProfile:id,user_id,service_name',
                'serviceProfile.user:id,name,email',
                'latestCompletion' => fn ($query) => $query->select([
                    'booking_completions.id',
                    'booking_completions.booking_id',
                    'booking_completions.dispute_reason',
                    'booking_completions.disputed_at',
                ]),
            ])
            ->where(function ($query) {
                $query->where('completion_status', 'completion_disputed')
                    ->orWhere('status', 'pending');
            })
            ->orderByRaw("CASE WHEN completion_status = 'completion_disputed' THEN 0 ELSE 1 END")
            ->orderByRaw("CASE WHEN status = 'pending' THEN expires_at ELSE updated_at END ASC")
            ->limit(6)
            ->get()
            ->map(function (Booking $booking) {
                $requiresResolution = $booking->completion_status === 'completion_disputed';

                return [
                    'id' => $booking->id,
                    'reference' => 'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
                    'service_name' => $booking->service_name_snapshot
                        ?: ($booking->serviceProfile?->service_name ?? 'Service booking'),
                    'organizer_name' => $booking->user?->name ?: ($booking->user?->email ?? 'Organizer'),
                    'vendor_name' => $booking->vendor_name_snapshot
                        ?: ($booking->serviceProfile?->user?->name ?? 'Vendor'),
                    'event_date' => $booking->selected_date->format('Y-m-d'),
                    'status' => $requiresResolution ? 'needs_resolution' : 'awaiting_vendor',
                    'detail' => $requiresResolution
                        ? ($booking->latestCompletion?->dispute_reason ?? 'The organizer reported a completion issue.')
                        : 'Vendor response is pending.',
                    'deadline' => $requiresResolution
                        ? $booking->latestCompletion?->disputed_at?->toDateTimeString()
                        : $booking->expires_at?->toDateTimeString(),
                    'path' => '/admin/bookings/'.$booking->id,
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentActivity(Request $request): array
    {
        return AdminAuditLog::query()
            ->with('actor:id,name,email,role')
            ->when(
                $request->user()->role !== 'super_admin',
                fn ($query) => $query->where('actor_id', $request->user()->id),
            )
            ->latest('created_at')
            ->limit(6)
            ->get()
            ->map(fn (AdminAuditLog $log) => [
                'id' => $log->id,
                'reference' => 'AUD-'.str_pad((string) $log->id, 7, '0', STR_PAD_LEFT),
                'module' => $log->module,
                'action' => $log->action,
                'description' => $log->description,
                'subject_label' => $log->subject_label,
                'actor_name' => $log->actor?->name ?: ($log->actor?->email ?? 'Former administrator'),
                'created_at' => $log->created_at->toDateTimeString(),
                'path' => '/admin/audit-logs/'.$log->id,
            ])
            ->all();
    }
}
