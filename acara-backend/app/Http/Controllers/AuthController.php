<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $user = Auth::user();

        if ($user->status !== 'active') {
            Auth::logout();
            return response()->json(['message' => 'Account not active'], 403);
        }
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'role' => $user->role,
            'user' => $user
        ]);
    }

    public function register(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:user,vendor,crew',
            'phone_number' => 'required|string|max:20',
            'ssm_registration' => 'required_if:role,vendor|nullable|string|max:255',
        ]);

        $user = \App\Models\User::create([
            'name' => $validatedData['name'],
            'email' => $validatedData['email'],
            'password' => \Hash::make($validatedData['password']),
            'role' => $validatedData['role'],
            'phone_number' => $validatedData['phone_number'],
            'ssm_registration' => $validatedData['ssm_registration'] ?? null,
            'status' => 'active', // Default status
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'token' => $token,
            'role' => $user->role,
            'user' => $user
        ], 201);
    }
}
