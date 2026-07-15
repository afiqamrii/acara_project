<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Review;
use App\Models\ServiceProfile;
use App\Models\User;
use App\Notifications\BookingActivityEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $vendor;

    private ServiceProfile $service;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('acara.booking_email.enabled', false);

        $this->customer = User::factory()->create(['role' => 'user']);
        $this->vendor = User::factory()->create([
            'role' => 'vendor',
            'profile_completed' => true,
        ]);
        $this->service = ServiceProfile::create([
            'user_id' => $this->vendor->id,
            'service_name' => 'Wedding Photography',
            'service_category' => 'Photography',
            'service_details' => 'Full-day wedding photography coverage.',
            'pricing_starting_from' => 1800,
            'pricing_unit' => 'event',
            'status' => 'approved',
        ]);
    }

    public function test_customer_can_review_a_completed_booking_and_vendor_is_notified(): void
    {
        $booking = $this->booking('completed');

        Sanctum::actingAs($this->customer);

        $this->postJson("/api/bookings/{$booking->id}/review", [
            'rating' => 5,
            'comment' => 'Excellent service and very professional throughout.',
        ])
            ->assertCreated()
            ->assertJsonPath('review.rating', 5);

        $this->assertDatabaseHas('reviews', [
            'booking_id' => $booking->id,
            'service_profile_id' => $this->service->id,
            'user_id' => $this->customer->id,
            'rating' => 5,
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->vendor->id,
            'booking_id' => $booking->id,
            'type' => 'review_received',
        ]);

        $this->getJson('/api/reviews')
            ->assertOk()
            ->assertJsonPath('summary.total', 1)
            ->assertJsonPath('summary.reviewed', 1)
            ->assertJsonPath('bookings.0.review.rating', 5);

        $this->getJson("/api/marketplace/services/{$this->service->id}")
            ->assertOk()
            ->assertJsonPath('rating_average', 5)
            ->assertJsonPath('review_count', 1)
            ->assertJsonPath('reviews.0.reviewer_name', $this->customer->name);
    }

    public function test_only_completed_bookings_owned_by_customer_can_be_reviewed(): void
    {
        $pendingBooking = $this->booking('pending');
        $otherCustomer = User::factory()->create(['role' => 'user']);
        $otherBooking = Booking::create([
            'user_id' => $otherCustomer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => now()->subDay()->toDateString(),
            'status' => 'completed',
        ]);

        Sanctum::actingAs($this->customer);

        $payload = [
            'rating' => 4,
            'comment' => 'A helpful and professional vendor experience.',
        ];

        $this->postJson("/api/bookings/{$pendingBooking->id}/review", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('booking');

        $this->postJson("/api/bookings/{$otherBooking->id}/review", $payload)
            ->assertNotFound();

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_booking_can_only_be_reviewed_once(): void
    {
        $booking = $this->booking('completed');
        Review::create([
            'booking_id' => $booking->id,
            'service_profile_id' => $this->service->id,
            'user_id' => $this->customer->id,
            'rating' => 4,
            'comment' => 'The service was reliable and delivered as agreed.',
        ]);

        Sanctum::actingAs($this->customer);

        $this->postJson("/api/bookings/{$booking->id}/review", [
            'rating' => 5,
            'comment' => 'Trying to publish a duplicate review for this booking.',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('booking');

        $this->assertDatabaseCount('reviews', 1);
    }

    public function test_customer_can_update_only_their_own_review(): void
    {
        $booking = $this->booking('completed');
        $review = Review::create([
            'booking_id' => $booking->id,
            'service_profile_id' => $this->service->id,
            'user_id' => $this->customer->id,
            'rating' => 3,
            'comment' => 'The original review has enough detail for validation.',
        ]);

        Sanctum::actingAs($this->customer);
        $this->patchJson("/api/reviews/{$review->id}", [
            'rating' => 5,
            'comment' => 'Updated after the vendor resolved every concern quickly.',
        ])
            ->assertOk()
            ->assertJsonPath('review.rating', 5);

        $otherCustomer = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($otherCustomer);
        $this->patchJson("/api/reviews/{$review->id}", [
            'rating' => 1,
            'comment' => 'This user must not be allowed to edit the review.',
        ])->assertNotFound();

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'rating' => 5,
        ]);
    }

    public function test_new_review_queues_an_email_notification_for_the_vendor(): void
    {
        Notification::fake();
        config()->set('acara.booking_email.enabled', true);

        $booking = $this->booking('completed');

        Sanctum::actingAs($this->customer);
        $this->postJson("/api/bookings/{$booking->id}/review", [
            'rating' => 5,
            'comment' => 'A polished service that deserves the highest recommendation.',
        ])->assertCreated();

        Notification::assertSentTo(
            $this->vendor,
            BookingActivityEmail::class,
            fn (BookingActivityEmail $notification): bool => $notification->activity->type === 'review_received'
                && $notification->activity->data['rating'] === 5
                && $notification->activity->action_url === "/marketplace/{$this->service->id}",
        );
    }

    private function booking(string $status): Booking
    {
        return Booking::create([
            'user_id' => $this->customer->id,
            'service_profile_id' => $this->service->id,
            'selected_date' => now()->subDay()->toDateString(),
            'status' => $status,
        ]);
    }
}
