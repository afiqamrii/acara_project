<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Quotation;
use App\Models\ServiceProfile;
use App\Services\BookingLifecycleService;
use App\Services\NotificationService;
use App\Services\PlatformSettingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly BookingLifecycleService $lifecycle,
        private readonly PlatformSettingService $settings,
    ) {}

    public function store(Request $request, int $bookingId)
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01', 'max:100000'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'discount_amount' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'terms' => ['nullable', 'string', 'max:2000'],
            'vendor_notes' => ['nullable', 'string', 'max:2000'],
            'valid_until' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
        ]);

        $result = DB::transaction(function () use ($request, $bookingId, $validated) {
            $serviceIds = ServiceProfile::where('user_id', $request->user()->id)->pluck('id');
            $booking = Booking::whereKey($bookingId)
                ->whereIn('service_profile_id', $serviceIds)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return 'not_found';
            }

            if ($this->lifecycle->expireIfOverdue($booking)) {
                return 'expired';
            }

            $latest = Quotation::where('booking_id', $booking->id)
                ->lockForUpdate()
                ->latest('version')
                ->first();

            if ($latest && $latest->status !== 'revision_requested') {
                return 'active_exists';
            }

            $validUntil = Carbon::createFromFormat('Y-m-d', $validated['valid_until'])->endOfDay();
            if ($validUntil->lt(now()) || $validUntil->gt($booking->selected_date->endOfDay())) {
                return 'invalid_validity';
            }

            $items = collect($validated['items'])->values()->map(function (array $item, int $index): array {
                $quantity = round((float) $item['quantity'], 2);
                $unitPrice = round((float) $item['unit_price'], 2);

                return [
                    'description' => trim($item['description']),
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'amount' => round($quantity * $unitPrice, 2),
                    'sort_order' => $index,
                ];
            });
            $subtotal = round((float) $items->sum('amount'), 2);
            if ($subtotal > 9999999999.99) {
                return 'invalid_total';
            }
            $discount = round((float) ($validated['discount_amount'] ?? 0), 2);
            if ($discount > $subtotal) {
                return 'invalid_discount';
            }

            $taxRate = round((float) ($validated['tax_rate'] ?? 0), 2);
            $taxAmount = round(($subtotal - $discount) * ($taxRate / 100), 2);
            $total = round($subtotal - $discount + $taxAmount, 2);
            if ($total > 9999999999.99) {
                return 'invalid_total';
            }

            $quotation = Quotation::create([
                'booking_id' => $booking->id,
                'created_by' => $request->user()->id,
                'version' => ($latest?->version ?? 0) + 1,
                'status' => 'sent',
                'currency' => 'MYR',
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'total_amount' => $total,
                'terms' => $this->optionalText($validated['terms'] ?? null),
                'vendor_notes' => $this->optionalText($validated['vendor_notes'] ?? null),
                'valid_until' => $validUntil,
                'sent_at' => now(),
            ]);
            $quotation->items()->createMany($items->all());

            $booking->update([
                'expires_at' => $validUntil,
                'reminder_sent_at' => null,
            ]);
            $this->notifications->quotationSent($booking, $quotation);

            return $quotation;
        });

        if ($result === 'not_found') {
            return response()->json(['message' => 'Pending booking request not found.'], 404);
        }

        if ($result === 'expired') {
            return response()->json(['message' => 'This booking request expired before a quotation could be sent.'], 409);
        }

        if ($result === 'active_exists') {
            return response()->json(['message' => 'Wait for the organizer to respond to the current quotation.'], 409);
        }

        if ($result === 'invalid_validity') {
            return response()->json([
                'message' => 'Quotation validity must end between today and the event date.',
                'errors' => ['valid_until' => ['Quotation validity must not pass the event date.']],
            ], 422);
        }

        if ($result === 'invalid_discount') {
            return response()->json([
                'message' => 'The discount cannot exceed the quotation subtotal.',
                'errors' => ['discount_amount' => ['The discount cannot exceed the subtotal.']],
            ], 422);
        }

        if ($result === 'invalid_total') {
            return response()->json([
                'message' => 'The quotation total is too large.',
                'errors' => ['items' => ['Reduce the item quantities or unit prices.']],
            ], 422);
        }

        return response()->json([
            'message' => 'Quotation sent to the organizer.',
            'quotation' => $result->toApiArray(),
        ], 201);
    }

    public function accept(Request $request, int $bookingId, int $quotationId)
    {
        $result = $this->respond($request, $bookingId, $quotationId, 'accepted');

        if ($result instanceof Quotation) {
            return response()->json([
                'message' => 'Quotation accepted and booking confirmed.',
                'status' => 'confirmed',
                'quotation' => $result->toApiArray(),
            ]);
        }

        return $this->responseError($result);
    }

    public function decline(Request $request, int $bookingId, int $quotationId)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);
        $result = $this->respond($request, $bookingId, $quotationId, 'declined', trim($validated['reason']));

        if ($result instanceof Quotation) {
            return response()->json([
                'message' => 'Quotation declined and booking request closed.',
                'status' => 'cancelled',
                'quotation' => $result->toApiArray(),
            ]);
        }

        return $this->responseError($result);
    }

    public function requestRevision(Request $request, int $bookingId, int $quotationId)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);
        $result = $this->respond($request, $bookingId, $quotationId, 'revision_requested', trim($validated['reason']));

        if ($result instanceof Quotation) {
            return response()->json([
                'message' => 'Revision request sent to the vendor.',
                'quotation' => $result->toApiArray(),
            ]);
        }

        return $this->responseError($result);
    }

    private function respond(
        Request $request,
        int $bookingId,
        int $quotationId,
        string $action,
        ?string $note = null,
    ): Quotation|string {
        return DB::transaction(function () use ($request, $bookingId, $quotationId, $action, $note) {
            $booking = Booking::whereKey($bookingId)
                ->where('user_id', $request->user()->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return 'not_found';
            }

            if ($this->lifecycle->expireIfOverdue($booking)) {
                return 'expired';
            }

            $quotation = Quotation::whereKey($quotationId)
                ->where('booking_id', $booking->id)
                ->where('status', 'sent')
                ->lockForUpdate()
                ->first();
            $latestId = Quotation::where('booking_id', $booking->id)->max('id');

            if (! $quotation || $quotation->id !== $latestId) {
                return 'not_active';
            }

            $quotation->update([
                'status' => $action,
                'responded_at' => now(),
                'response_note' => $note,
            ]);

            if ($action === 'accepted') {
                $booking->update([
                    'status' => 'confirmed',
                    'price_snapshot' => $quotation->total_amount,
                    'pricing_unit_snapshot' => 'quoted package',
                    'confirmed_at' => now(),
                    'expires_at' => null,
                    'reminder_sent_at' => null,
                ]);
                $this->notifications->quotationAccepted($booking, $quotation);
            } elseif ($action === 'declined') {
                $booking->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => 'Quotation declined: '.$note,
                    'cancelled_by' => 'customer',
                    'cancelled_at' => now(),
                    'expires_at' => null,
                ]);
                $this->releaseDateIfFuture($booking);
                $this->notifications->quotationDeclined($booking, $quotation);
            } else {
                $booking->update([
                    'expires_at' => now()->addHours($this->settings->bookingResponseHours()),
                    'reminder_sent_at' => null,
                ]);
                $this->notifications->quotationRevisionRequested($booking, $quotation);
            }

            return $quotation;
        });
    }

    private function responseError(string $result)
    {
        if ($result === 'expired') {
            return response()->json(['message' => 'This quotation has expired and the date was released.'], 409);
        }

        if ($result === 'not_active') {
            return response()->json(['message' => 'This quotation is no longer awaiting a response.'], 409);
        }

        return response()->json(['message' => 'Pending booking quotation not found.'], 404);
    }

    private function releaseDateIfFuture(Booking $booking): void
    {
        if ($booking->selected_date->lt(today())) {
            return;
        }

        DB::table('service_availabilities')->insertOrIgnore([
            'service_profile_id' => $booking->service_profile_id,
            'available_date' => $booking->selected_date->format('Y-m-d'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function optionalText(?string $value): ?string
    {
        return $value !== null && trim($value) !== '' ? trim($value) : null;
    }
}
