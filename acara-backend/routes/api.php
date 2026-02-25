<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

use App\Http\Controllers\AuthController;
use App\Http\Controllers\VendorVerificationController;
use App\Http\Controllers\VendorController;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Super admin routes
Route::middleware(['auth:sanctum', 'role:super_admin'])->group(function () {
    Route::post('/admin/invite', [AuthController::class, 'inviteAdmin']);
});

// Profile completion (authenticated users with incomplete profiles)
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/profile/complete', [AuthController::class, 'completeProfile']);
    Route::post('/email/resend', [AuthController::class, 'resendVerification']);
    
    Route::get('/admin/vendors', [VendorVerificationController::class, 'index']);

    Route::patch('/admin/vendors/{id}/approve', [VendorVerificationController::class, 'approve']);

    Route::patch('/admin/vendors/{id}/reject', [VendorVerificationController::class, 'reject']);
});

// Protected routes (require completed profile)
Route::middleware(['auth:sanctum', 'profile.completed'])->group(function () {
    // Add other routes here that require a complete profile
    Route::post('/vendor/register', [VendorController::class, 'store']);
});

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verify'])
    ->middleware('signed')
    ->name('verification.verify');
