<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\Events\Registered;
use App\Notifications\AdminInviteNotification;

class AuthService
{
    /**
     * Register a new user.
     *
     * @param array $data
     * @return User
     */
    public function registerUser(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'phone_number' => $data['phone_number'],
            'status' => 'active',
        ]);

        event(new Registered($user));

        return $user;
    }

    /**
     * Invite a new admin user.
     *
     * @param string $email
     * @param int $invitedBy
     * @return User
     */
    public function inviteAdmin(string $email, int $invitedBy): User
    {
        $defaultPassword = env('DEFAULT_ADMIN_PASSWORD', 'Admin@123');

        $user = User::create([
            'name' => '', // Will be filled during profile completion
            'email' => $email,
            'password' => Hash::make($defaultPassword),
            'role' => 'admin',
            'phone_number' => '', // Will be filled during profile completion
            'status' => 'active',
            'profile_completed' => false,
            'invited_by' => $invitedBy,
        ]);

        $user->notify(new AdminInviteNotification($defaultPassword));
        $user->sendEmailVerificationNotification();

        return $user;
    }

    /**
     * Complete user profile for invited admin.
     *
     * @param User $user
     * @param array $data
     * @return User
     */
    public function completeProfile(User $user, array $data): User
    {
        $user->update([
            'name' => $data['name'],
            'phone_number' => $data['phone_number'],
            'password' => Hash::make($data['password']),
            'profile_completed' => true,
        ]);

        return $user->fresh();
    }
}
