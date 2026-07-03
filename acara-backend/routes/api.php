<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ServiceVerificationController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\VendorVerificationController;
use App\Http\Controllers\AvailabilityController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\VendorBookingController;
use App\Http\Controllers\ProfileController;

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
});

// ─── Customer Booking Routes (authenticated) ─────────────────────────────────
Route::middleware(['auth:sanctum', 'role:user'])->group(function () {
    Route::get('/bookings/cart', [BookingController::class, 'cartIndex']);
    Route::post('/bookings/cart', [BookingController::class, 'addToCart']);
    Route::delete('/bookings/cart/{id}', [BookingController::class, 'removeFromCart']);
    Route::post('/bookings/confirm', [BookingController::class, 'confirmCart']);
    Route::get('/bookings', [BookingController::class, 'myBookings']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancelBooking']);
});

// ─── Vendor Routes (authenticated + completed profile) ────────────────────────
Route::middleware(['auth:sanctum', 'profile.completed', 'role:vendor'])->group(function () {
    Route::post('/service/register', [ServiceController::class, 'store']);
    Route::post('/vendor/register', [VendorController::class, 'store']);
    Route::get('/vendor/profile/status', [VendorController::class, 'status']);
    Route::get('/vendor/services', [AvailabilityController::class, 'vendorServices']);
    Route::get('/vendor/availability/{serviceId}', [AvailabilityController::class, 'vendorAvailability']);
    Route::put('/vendor/availability/{serviceId}', [AvailabilityController::class, 'sync']);
    Route::post('/vendor/availability/{serviceId}/reopen', [AvailabilityController::class, 'reopenDate']);

    Route::get('/vendor/bookings', [VendorBookingController::class, 'index']);
    Route::patch('/vendor/bookings/{id}/approve', [VendorBookingController::class, 'approve']);
    Route::patch('/vendor/bookings/{id}/cancel', [VendorBookingController::class, 'cancel']);
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
});

// ─── Super Admin Routes ───────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'role:super_admin'])->group(function () {
    Route::post('/admin/invite', [AuthController::class, 'inviteAdmin']);
});
