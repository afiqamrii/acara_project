<?php

namespace App\Http\Controllers;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\BookingCompletion;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Models\VendorProfile;
use App\Services\AdminAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminReportController extends Controller
{
    public function __construct(private readonly AdminAuditService $audits) {}

    public function show(Request $request): JsonResponse
    {
        [$from, $to] = $this->validatedRange($request);
        $bookingQuery = $this->bookingsInRange($from, $to);
        $bookingStatuses = (clone $bookingQuery)
            ->select('status', DB::raw('COUNT(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count);

        $totalBookings = $bookingStatuses->sum();
        $convertedBookings = ($bookingStatuses['confirmed'] ?? 0) + ($bookingStatuses['completed'] ?? 0);
        $newAccounts = User::query()
            ->whereNotIn('role', ['admin', 'super_admin'])
            ->whereBetween('created_at', [$from, $to]);

        $serviceSubmissions = ServiceProfile::query()
            ->where(function (Builder $query) use ($from, $to) {
                $query->whereBetween('created_at', [$from, $to])
                    ->orWhereBetween('resubmitted_at', [$from, $to]);
            });
        $vendorSubmissions = VendorProfile::query()->whereBetween('created_at', [$from, $to]);
        $verificationDecisions = AdminAuditLog::query()
            ->whereIn('action', [
                'service_approved',
                'service_rejected',
                'vendor_approved',
                'vendor_rejected',
            ])
            ->whereBetween('created_at', [$from, $to]);

        $reportedIssues = BookingCompletion::whereBetween('disputed_at', [$from, $to])->count();
        $resolvedIssues = BookingCompletion::whereBetween('resolved_at', [$from, $to])->count();

        return response()->json([
            'period' => [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
                'days' => $from->startOfDay()->diffInDays($to->startOfDay()) + 1,
            ],
            'summary' => [
                'booking_requests' => $totalBookings,
                'conversion_rate' => $totalBookings > 0
                    ? round(($convertedBookings / $totalBookings) * 100, 1)
                    : 0,
                'new_accounts' => (clone $newAccounts)->count(),
                'completion_issues' => $reportedIssues,
            ],
            'booking_funnel' => [
                'total' => $totalBookings,
                'pending' => $bookingStatuses['pending'] ?? 0,
                'confirmed' => $bookingStatuses['confirmed'] ?? 0,
                'completed' => $bookingStatuses['completed'] ?? 0,
                'rejected' => $bookingStatuses['rejected'] ?? 0,
                'cancelled' => $bookingStatuses['cancelled'] ?? 0,
                'expired' => $bookingStatuses['expired'] ?? 0,
            ],
            'accounts' => [
                'new_total' => (clone $newAccounts)->count(),
                'organizers' => (clone $newAccounts)->where('role', 'user')->count(),
                'vendors' => (clone $newAccounts)->where('role', 'vendor')->count(),
                'verified' => (clone $newAccounts)->whereNotNull('email_verified_at')->count(),
                'suspended_current' => User::whereNotIn('role', ['admin', 'super_admin'])
                    ->where('status', 'suspended')
                    ->count(),
            ],
            'verifications' => [
                'new_submissions' => (clone $serviceSubmissions)->count() + (clone $vendorSubmissions)->count(),
                'approved' => (clone $verificationDecisions)
                    ->whereIn('action', ['service_approved', 'vendor_approved'])
                    ->count(),
                'rejected' => (clone $verificationDecisions)
                    ->whereIn('action', ['service_rejected', 'vendor_rejected'])
                    ->count(),
                'pending_current' => ServiceProfile::where('status', 'pending_verification')->count()
                    + VendorProfile::whereIn('status', ['pending_verification', 'pending_completion'])->count(),
                'services_pending' => ServiceProfile::where('status', 'pending_verification')->count(),
                'vendors_pending' => VendorProfile::whereIn('status', ['pending_verification', 'pending_completion'])->count(),
            ],
            'completion_issues' => [
                'reported' => $reportedIssues,
                'resolved' => $resolvedIssues,
                'open_current' => BookingCompletion::where('status', 'disputed')->count(),
            ],
            'daily_activity' => $this->dailyActivity($from, $to),
            'generated_at' => now()->toDateTimeString(),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        [$from, $to] = $this->validatedRange($request);
        $rowCount = $this->bookingsInRange($from, $to)->count();
        $reference = 'RPT-'.$from->format('Ymd').'-'.$to->format('Ymd');

        $this->audits->record(
            request: $request,
            module: 'administration',
            action: 'operations_report_exported',
            description: "Exported an operational booking report containing {$rowCount} records.",
            subjectLabel: 'Operations report '.$from->toDateString().' to '.$to->toDateString(),
            subjectReference: $reference,
            metadata: [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
                'row_count' => $rowCount,
                'format' => 'csv',
            ],
        );

        $filename = 'acara-operations-'.$from->format('Ymd').'-'.$to->format('Ymd').'.csv';

        return response()->streamDownload(function () use ($from, $to) {
            $output = fopen('php://output', 'wb');
            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, [
                'Booking Reference',
                'Requested At',
                'Event Date',
                'Booking Status',
                'Completion Workflow',
                'Service',
                'Organizer',
                'Organizer Email',
                'Vendor',
                'Vendor Response Deadline',
                'Completed At',
            ]);

            $this->bookingsInRange($from, $to)
                ->with([
                    'user:id,name,email',
                    'serviceProfile:id,user_id,service_name',
                    'serviceProfile.user:id,name,email',
                ])
                ->orderBy('id')
                ->chunkById(500, function ($bookings) use ($output) {
                    foreach ($bookings as $booking) {
                        fputcsv($output, array_map($this->csvValue(...), [
                            'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
                            $booking->created_at->toDateTimeString(),
                            $booking->selected_date->format('Y-m-d'),
                            $booking->status,
                            $booking->completion_status ?: 'not_started',
                            $booking->service_name_snapshot
                                ?: ($booking->serviceProfile?->service_name ?? 'Service booking'),
                            $booking->user?->name ?: ($booking->user?->email ?? 'Organizer'),
                            $booking->user?->email ?? '',
                            $booking->vendor_name_snapshot
                                ?: ($booking->serviceProfile?->user?->name ?? 'Vendor'),
                            $booking->expires_at?->toDateTimeString() ?? '',
                            $booking->completed_at?->toDateTimeString() ?? '',
                        ]));
                    }
                });

            fclose($output);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, private',
        ]);
    }

    private function bookingsInRange(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return Booking::query()
            ->where('status', '!=', 'cart')
            ->whereBetween('created_at', [$from, $to]);
    }

    /**
     * @return array<int, array{date: string, bookings: int, accounts: int}>
     */
    private function dailyActivity(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $bookingCounts = $this->bookingsInRange($from, $to)
            ->selectRaw('DATE(created_at) as report_date, COUNT(*) as aggregate')
            ->groupBy('report_date')
            ->pluck('aggregate', 'report_date');
        $accountCounts = User::query()
            ->whereNotIn('role', ['admin', 'super_admin'])
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as report_date, COUNT(*) as aggregate')
            ->groupBy('report_date')
            ->pluck('aggregate', 'report_date');

        $activity = [];
        for ($date = $from->startOfDay(); $date->lte($to); $date = $date->addDay()) {
            $key = $date->toDateString();
            $activity[] = [
                'date' => $key,
                'bookings' => (int) ($bookingCounts[$key] ?? 0),
                'accounts' => (int) ($accountCounts[$key] ?? 0),
            ];
        }

        return $activity;
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function validatedRange(Request $request): array
    {
        $validator = Validator::make($request->all(), [
            'date_from' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today', 'after_or_equal:date_from'],
        ]);

        $validator->after(function ($validator) use ($request) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $to = CarbonImmutable::parse($request->input('date_to', today()->toDateString()));
            $from = CarbonImmutable::parse($request->input('date_from', $to->subDays(29)->toDateString()));
            if ($from->diffInDays($to) > 365) {
                $validator->errors()->add('date_from', 'The reporting period cannot exceed 366 days.');
            }
        });

        $validated = $validator->validate();
        $to = CarbonImmutable::parse($validated['date_to'] ?? today()->toDateString())->endOfDay();
        $from = CarbonImmutable::parse($validated['date_from'] ?? $to->subDays(29)->toDateString())->startOfDay();

        return [$from, $to];
    }

    private function csvValue(mixed $value): string
    {
        $text = (string) $value;

        return preg_match('/^[=+\-@]/', $text) ? "'{$text}" : $text;
    }
}
