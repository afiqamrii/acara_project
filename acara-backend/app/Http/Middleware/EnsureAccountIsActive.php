<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->status !== 'active') {
            return response()->json([
                'message' => 'This account is suspended. Please contact an ACARA administrator if you need assistance.',
                'code' => 'ACCOUNT_SUSPENDED',
            ], 403);
        }

        return $next($request);
    }
}
