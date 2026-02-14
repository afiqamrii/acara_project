<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\AuthService;
use App\Http\Requests\RegisterRequest;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

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
            Log::warning('Login failed for email: ' . $request->email);
            return response()->json(['message' => 'Email or password is incorrect.'], 401);
        }

        $user = Auth::user();

        if ($user->status !== 'active') {
            Auth::logout();
            Log::info('Login attempt for inactive account: ' . $user->email);
            return response()->json(['message' => 'Account not active'], 403);
        }
        $token = $user->createToken('auth_token')->plainTextToken;

        Log::info('User logged in successfully: ' . $user->email);

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'role' => $user->role,
            'user' => $user,
            'is_verified' => $user->hasVerifiedEmail() ? true : false,
            'email_verified_at' => $user->email_verified_at,
        ]);
    }

    public function register(RegisterRequest $request) 
    {
        // 1. Check if user already exists
        $existingUser = \App\Models\User::where('email', $request->email)->first();

        if ($existingUser) {
            // Case A: User exists AND is verified -> Error "Email Taken"
            if ($existingUser->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'The email has already been taken.',
                    'errors' => ['email' => ['The email has already been taken.']]
                ], 422);
            }

            // Case B: User exists BUT is NOT verified -> Resend Verification
            $existingUser->sendEmailVerificationNotification();

            return response()->json([
                'message' => 'Verification link resent. Please check your email.',
                // We return a specific status code or just 200 with a different message
            ], 200);
        }

        // Case C: New User -> Create Account (Atomic Transaction)
        DB::beginTransaction();
        
        try {
            Log::info('Registration attempt for email: ' . $request->email);
            
            $user = $this->authService->registerUser($request->validated());
    
            $token = $user->createToken('auth_token')->plainTextToken;
    
            Log::info('User registered successfully: ' . $user->id);

            DB::commit();
    
            return response()->json([
                'message' => 'User registered successfully',
                'token' => $token,
                'role' => $user->role,
                'user' => $user
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Registration failed: ' . $e->getMessage());
            throw $e;
        }
    }

    public function resendVerification(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.'], 400);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification link sent!']);
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
