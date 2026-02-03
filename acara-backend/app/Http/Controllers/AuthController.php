<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\AuthService;
use App\Http\Requests\RegisterRequest;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

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

    public function register(RegisterRequest $request)
    {
        $user = $this->authService->registerUser($request->validated());

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'token' => $token,
            'role' => $user->role,
            'user' => $user
        ], 201);
    }

    public function verify(Request $request)
    {
        $user = \App\Models\User::find($request->route('id'));

        if (! $user) {
            return response()->json(['message' => 'Invalid user'], 400);
        }

        if ($user->hasVerifiedEmail()) {
            // Redirect to frontend login with a message
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/login?verified=1');
        }

        if ($user->markEmailAsVerified()) {
            event(new \Illuminate\Auth\Events\Verified($user));
        }

        // Redirect to frontend login with success
        return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/login?verified=1');
    }
}
