<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AvailabilityController;
use App\Http\Controllers\BookingCompletionController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\BookingMessageController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\NotificationPreferenceController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\QuotationDocumentController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceVerificationController;
use App\Http\Controllers\VendorBookingController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\VendorDashboardController;
use App\Http\Controllers\VendorVerificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ─── Public Routes ───────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/marketplace/services', [MarketplaceController::class, 'services']);
Route::get('/marketplace/services/{id}', [MarketplaceController::class, 'show']);
Route::get('/marketplace/services/{id}/availability', [AvailabilityController::class, 'publicAvailability']);

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verify'])
    ->middleware('signed')
    ->name('verification.verify');

// ─── Authenticated Routes ─────────────────────────────────────────────────────
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/resend', [AuthController::class, 'resendVerification']);
    Route::post('/profile/complete', [AuthController::class, 'completeProfile']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::get('/notification-preferences', [NotificationPreferenceController::class, 'show']);
    Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update']);

    Route::get('/bookings/{id}/messages', [BookingMessageController::class, 'index']);
    Route::post('/bookings/{id}/messages', [BookingMessageController::class, 'store']);
    Route::patch('/bookings/{id}/messages/read', [BookingMessageController::class, 'markRead']);
    Route::get('/bookings/{bookingId}/quotations/{quotationId}/pdf', [QuotationDocumentController::class, 'download']);
});

// ─── Planning Booking Routes (organizers and vendors) ────────────────────────
Route::middleware(['auth:sanctum', 'role:user,vendor'])->group(function () {
    Route::get('/bookings/cart', [BookingController::class, 'cartIndex']);
    Route::post('/bookings/cart', [BookingController::class, 'addToCart']);
    Route::delete('/bookings/cart/{id}', [BookingController::class, 'removeFromCart']);
    Route::put('/bookings/cart/{id}/brief', [BookingController::class, 'updateCartBrief']);
    Route::post('/bookings/confirm', [BookingController::class, 'confirmCart']);
    Route::get('/bookings', [BookingController::class, 'myBookings']);
    Route::get('/bookings/{id}', [BookingController::class, 'booking']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancelBooking']);
    Route::patch('/bookings/{bookingId}/quotations/{quotationId}/accept', [QuotationController::class, 'accept']);
    Route::patch('/bookings/{bookingId}/quotations/{quotationId}/decline', [QuotationController::class, 'decline']);
    Route::patch('/bookings/{bookingId}/quotations/{quotationId}/revision', [QuotationController::class, 'requestRevision']);
    Route::patch('/bookings/{id}/completion/confirm', [BookingCompletionController::class, 'confirm']);
    Route::patch('/bookings/{id}/completion/dispute', [BookingCompletionController::class, 'dispute']);
    Route::get('/bookings/{id}/reschedule/availability', [BookingController::class, 'rescheduleAvailability']);
    Route::post('/bookings/{id}/reschedule', [BookingController::class, 'requestReschedule']);
    Route::patch('/bookings/{id}/reschedule/withdraw', [BookingController::class, 'withdrawReschedule']);
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::post('/bookings/{id}/review', [ReviewController::class, 'store']);
    Route::patch('/reviews/{id}', [ReviewController::class, 'update']);
});

// ─── Vendor Routes (authenticated + completed profile) ────────────────────────
Route::middleware(['auth:sanctum', 'profile.completed', 'role:vendor'])->group(function () {
    Route::get('/vendor/dashboard', [VendorDashboardController::class, 'show']);
    Route::post('/service/register', [ServiceController::class, 'store']);
    Route::post('/vendor/register', [VendorController::class, 'store']);
    Route::get('/vendor/profile', [VendorController::class, 'show']);
    Route::get('/vendor/profile/status', [VendorController::class, 'status']);
    Route::get('/vendor/services', [ServiceController::class, 'index']);
    Route::get('/vendor/services/{id}', [ServiceController::class, 'show']);
    Route::patch('/vendor/services/{id}', [ServiceController::class, 'update']);
    Route::patch('/vendor/services/{id}/visibility', [ServiceController::class, 'updateVisibility']);
    Route::post('/vendor/services/{id}/resubmit', [ServiceController::class, 'resubmit']);
    Route::get('/vendor/availability/{serviceId}', [AvailabilityController::class, 'vendorAvailability']);
    Route::put('/vendor/availability/{serviceId}', [AvailabilityController::class, 'sync']);
    Route::post('/vendor/availability/{serviceId}/reopen', [AvailabilityController::class, 'reopenDate']);

    Route::get('/vendor/bookings', [VendorBookingController::class, 'index']);
    Route::get('/vendor/booking-conversations', [BookingMessageController::class, 'vendorConversations']);
    Route::post('/vendor/bookings/{bookingId}/quotations', [QuotationController::class, 'store']);
    Route::patch('/vendor/bookings/{id}/reject', [VendorBookingController::class, 'reject']);
    Route::post('/vendor/bookings/{id}/completion', [BookingCompletionController::class, 'store']);
    Route::patch('/vendor/bookings/{id}/cancel', [VendorBookingController::class, 'cancel']);
    Route::patch('/vendor/bookings/{id}/reschedule/approve', [VendorBookingController::class, 'approveReschedule']);
    Route::patch('/vendor/bookings/{id}/reschedule/reject', [VendorBookingController::class, 'rejectReschedule']);
});

// ─── Admin Routes (authenticated + admin role) ────────────────────────────────
Route::middleware(['auth:sanctum', 'role:admin,super_admin'])->group(function () {
    Route::get('/admin/services', [ServiceVerificationController::class, 'index']);
    Route::patch('/admin/services/{id}/approve', [ServiceVerificationController::class, 'approve']);
    Route::patch('/admin/services/{id}/reject', [ServiceVerificationController::class, 'reject']);

    Route::get('/admin/vendors', [VendorVerificationController::class, 'index']);
    Route::patch('/admin/vendors/{id}/approve', [VendorVerificationController::class, 'approve']);
    Route::patch('/admin/vendors/{id}/reject', [VendorVerificationController::class, 'reject']);

    Route::get('/admin/bookings', [BookingController::class, 'adminBookings']);
    Route::get('/admin/bookings/{id}', [BookingController::class, 'adminBooking']);
    Route::patch('/admin/bookings/{id}/completion/resolve', [BookingCompletionController::class, 'resolve']);
});

// ─── Super Admin Routes ───────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'role:super_admin'])->group(function () {
    Route::post('/admin/invite', [AuthController::class, 'inviteAdmin']);
});
