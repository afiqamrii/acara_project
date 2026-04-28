<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ServiceVerificationController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\VendorVerificationController;
use App\Http\Controllers\MarketplaceController;

// ─── Public Routes ───────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/marketplace/services', [MarketplaceController::class, 'services']);

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
});

// ─── Vendor Routes (authenticated + completed profile) ────────────────────────
Route::middleware(['auth:sanctum', 'profile.completed'])->group(function () {
    Route::post('/service/register', [ServiceController::class, 'store']);
    Route::post('/vendor/register', [VendorController::class, 'store']);
});

// ─── Admin Routes (authenticated + admin role) ────────────────────────────────
Route::middleware(['auth:sanctum', 'role:admin,super_admin'])->group(function () {
    Route::get('/admin/services', [ServiceVerificationController::class, 'index']);
    Route::patch('/admin/services/{id}/approve', [ServiceVerificationController::class, 'approve']);
    Route::patch('/admin/services/{id}/reject', [ServiceVerificationController::class, 'reject']);

    Route::get('/admin/vendors', [VendorVerificationController::class, 'index']);
    Route::patch('/admin/vendors/{id}/approve', [VendorVerificationController::class, 'approve']);
    Route::patch('/admin/vendors/{id}/reject', [VendorVerificationController::class, 'reject']);
});

// ─── Super Admin Routes ───────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'role:super_admin'])->group(function () {
    Route::post('/admin/invite', [AuthController::class, 'inviteAdmin']);
});