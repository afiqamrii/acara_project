<?php

namespace Tests\Unit;

use App\Http\Middleware\RoleMiddleware;
use Illuminate\Http\Request;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    public function test_it_allows_an_authenticated_user_with_an_expected_role(): void
    {
        $request = Request::create('/api/vendor/bookings');
        $request->setUserResolver(fn () => (object) ['role' => 'vendor']);

        $response = (new RoleMiddleware())->handle(
            $request,
            fn () => response()->json(['ok' => true]),
            'vendor'
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_it_rejects_an_authenticated_user_with_the_wrong_role(): void
    {
        $request = Request::create('/api/vendor/bookings');
        $request->setUserResolver(fn () => (object) ['role' => 'user']);

        $response = (new RoleMiddleware())->handle(
            $request,
            fn () => response()->json(['ok' => true]),
            'vendor'
        );

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame(
            ['message' => 'Unauthorized access.'],
            $response->getData(true)
        );
    }

    public function test_it_allows_a_vendor_to_use_routes_shared_with_customers(): void
    {
        $request = Request::create('/api/bookings');
        $request->setUserResolver(fn () => (object) ['role' => 'vendor']);

        $response = (new RoleMiddleware())->handle(
            $request,
            fn () => response()->json(['ok' => true]),
            'user',
            'vendor'
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_it_rejects_an_unauthenticated_request(): void
    {
        $request = Request::create('/api/vendor/bookings');

        $response = (new RoleMiddleware())->handle(
            $request,
            fn () => response()->json(['ok' => true]),
            'vendor'
        );

        $this->assertSame(403, $response->getStatusCode());
    }
}
