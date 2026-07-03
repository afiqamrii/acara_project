<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user()->load('vendorProfile');

        $madeBookings = $user->bookings();
        $receivedBookings = Booking::query()->whereHas('serviceProfile', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        });

        $bookingStats = [
            'made' => [
                'total' => (clone $madeBookings)->whereIn('status', ['pending', 'confirmed', 'cancelled'])->count(),
                'pending' => (clone $madeBookings)->where('status', 'pending')->count(),
                'confirmed' => (clone $madeBookings)->where('status', 'confirmed')->count(),
            ],
            'received' => [
                'total' => (clone $receivedBookings)->whereIn('status', ['pending', 'confirmed', 'cancelled'])->count(),
                'pending' => (clone $receivedBookings)->where('status', 'pending')->count(),
                'confirmed' => (clone $receivedBookings)->where('status', 'confirmed')->count(),
            ],
        ];

        $storageUrl = rtrim(asset('storage'), '/');

        return response()->json([
            'user' => [
                'id'                => $user->id,
                'name'              => $user->name,
                'email'             => $user->email,
                'phone_number'      => $user->phone_number,
                'role'              => $user->role,
                'avatar_url'        => $user->avatar_path
                    ? $storageUrl . '/' . ltrim($user->avatar_path, '/')
                    : null,
                'profile_completed' => $user->profile_completed,
                'email_verified_at' => $user->email_verified_at,
                'created_at'        => $user->created_at,
            ],
            'vendor_profile' => $user->vendorProfile ? [
                'business_name'      => $user->vendorProfile->business_name,
                'status'             => $user->vendorProfile->status,
                'service_area_state' => $user->vendorProfile->service_area_state,
                'service_area_town'  => $user->vendorProfile->service_area_town,
            ] : null,
            'booking_stats' => $bookingStats,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:20'],
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'name'         => $user->name,
                'email'        => $user->email,
                'phone_number' => $user->phone_number,
            ],
        ]);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $ext      = $request->file('avatar')->getClientOriginalExtension();
        $filename = 'avatar_' . $user->id . '_' . now()->format('YmdHis') . '.' . $ext;
        $path     = $request->file('avatar')->storeAs('avatars', $filename, 'public');

        $user->update(['avatar_path' => $path]);

        $storageUrl = rtrim(asset('storage'), '/');

        return response()->json([
            'message'    => 'Photo updated successfully.',
            'avatar_url' => $storageUrl . '/' . $path,
        ]);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors'  => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
