<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Review;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request)
    {
        $bookings = Booking::query()
            ->with(['serviceProfile.user', 'review'])
            ->where('user_id', $request->user()->id)
            ->where('status', 'completed')
            ->latest('updated_at')
            ->get()
            ->map(fn (Booking $booking) => [
                'booking_id' => $booking->id,
                'booking_reference' => 'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
                'service_id' => $booking->service_profile_id,
                'service_name' => $booking->serviceProfile->service_name,
                'vendor_name' => $booking->serviceProfile->user?->name ?? 'Vendor',
                'selected_date' => $booking->selected_date->format('Y-m-d'),
                'completed_at' => $booking->updated_at->toDateTimeString(),
                'review' => $booking->review ? $this->mapReview($booking->review) : null,
            ]);

        return response()->json([
            'bookings' => $bookings,
            'summary' => [
                'total' => $bookings->count(),
                'reviewed' => $bookings->whereNotNull('review')->count(),
                'awaiting_review' => $bookings->whereNull('review')->count(),
            ],
        ]);
    }

    public function store(Request $request, int $bookingId)
    {
        $validated = $this->validateReview($request);

        $review = DB::transaction(function () use ($request, $bookingId, $validated) {
            $booking = Booking::query()
                ->where('id', $bookingId)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($booking->status !== 'completed') {
                throw ValidationException::withMessages([
                    'booking' => ['Only completed bookings can be reviewed.'],
                ]);
            }

            if (Review::where('booking_id', $booking->id)->exists()) {
                throw ValidationException::withMessages([
                    'booking' => ['This booking has already been reviewed.'],
                ]);
            }

            $review = Review::create([
                'booking_id' => $booking->id,
                'service_profile_id' => $booking->service_profile_id,
                'user_id' => $request->user()->id,
                'rating' => $validated['rating'],
                'comment' => trim($validated['comment']),
            ]);

            $this->notifications->reviewReceived($review);

            return $review;
        });

        Cache::forget('marketplace:service:'.$review->service_profile_id);

        return response()->json([
            'message' => 'Review published successfully.',
            'review' => $this->mapReview($review),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $validated = $this->validateReview($request);

        $review = Review::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $review->update([
            'rating' => $validated['rating'],
            'comment' => trim($validated['comment']),
        ]);

        Cache::forget('marketplace:service:'.$review->service_profile_id);

        return response()->json([
            'message' => 'Review updated successfully.',
            'review' => $this->mapReview($review->fresh()),
        ]);
    }

    /**
     * @return array{rating: int, comment: string}
     */
    private function validateReview(Request $request): array
    {
        return $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['required', 'string', 'min:10', 'max:2000'],
        ]);
    }

    private function mapReview(Review $review): array
    {
        return [
            'id' => $review->id,
            'rating' => $review->rating,
            'comment' => $review->comment,
            'created_at' => $review->created_at->toDateTimeString(),
            'updated_at' => $review->updated_at->toDateTimeString(),
        ];
    }
}
