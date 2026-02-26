<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileCompleted
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && !$request->user()->profile_completed) {
            return response()->json([
                'message' => 'Please complete your profile to continue.',
                'code' => 'PROFILE_INCOMPLETE'
            ], 403);
        }

        return $next($request);
    }
}
