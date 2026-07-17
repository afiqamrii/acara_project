<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\User;
use App\Models\UserModerationAction;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::in(['all', 'user', 'vendor', 'crew', 'admin', 'super_admin'])],
            'status' => ['nullable', Rule::in(['all', 'active', 'suspended'])],
            'verification' => ['nullable', Rule::in(['all', 'verified', 'unverified'])],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = User::query()
            ->with('vendorProfile:id,user_id,business_name,status')
            ->withCount([
                'bookings as bookings_made_count' => fn ($query) => $query->where('status', '!=', 'cart'),
                'receivedBookings as bookings_received_count' => fn ($query) => $query->where('bookings.status', '!=', 'cart'),
                'serviceProfiles as services_count',
            ]);

        if ($search = trim($validated['search'] ?? '')) {
            $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%")
                    ->orWhereHas('vendorProfile', fn ($vendor) => $vendor->where('business_name', 'like', "%{$search}%"));
            });
        }

        if (($validated['role'] ?? 'all') !== 'all') {
            $query->where('role', $validated['role']);
        }

        if (($validated['status'] ?? 'all') !== 'all') {
            $query->where('status', $validated['status']);
        }

        if (($validated['verification'] ?? 'all') === 'verified') {
            $query->whereNotNull('email_verified_at');
        } elseif (($validated['verification'] ?? 'all') === 'unverified') {
            $query->whereNull('email_verified_at');
        }

        $users = $query
            ->orderByRaw("CASE WHEN status = 'suspended' THEN 0 ELSE 1 END")
            ->latest('created_at')
            ->paginate($validated['per_page'] ?? 20);

        return response()->json([
            'users' => collect($users->items())->map(fn (User $user) => $this->mapUser($user)),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
            'stats' => [
                'total' => User::count(),
                'active' => User::where('status', 'active')->count(),
                'suspended' => User::where('status', 'suspended')->count(),
                'unverified' => User::whereNull('email_verified_at')->count(),
            ],
        ]);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $user->load([
            'vendorProfile',
            'serviceProfiles' => fn ($query) => $query->latest(),
            'moderationActions.admin:id,name,role',
            'suspendedBy:id,name,role',
        ])->loadCount([
            'bookings as bookings_made_count' => fn ($query) => $query->where('status', '!=', 'cart'),
            'receivedBookings as bookings_received_count' => fn ($query) => $query->where('bookings.status', '!=', 'cart'),
            'serviceProfiles as services_count',
        ]);

        $madeBookings = $user->bookings()->where('status', '!=', 'cart');
        $receivedBookings = Booking::query()
            ->whereHas('serviceProfile', fn ($query) => $query->where('user_id', $user->id))
            ->where('status', '!=', 'cart');

        $recentMade = (clone $madeBookings)
            ->with('serviceProfile:id,user_id,service_name')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (Booking $booking) => $this->mapBooking($booking, 'organizer'));
        $recentReceived = (clone $receivedBookings)
            ->with(['serviceProfile:id,user_id,service_name', 'user:id,name,email'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (Booking $booking) => $this->mapBooking($booking, 'vendor'));

        $permissions = $this->moderationPermissions($request->user(), $user);

        return response()->json([
            'user' => $this->mapUser($user, true),
            'vendor_profile' => $user->vendorProfile ? [
                'business_name' => $user->vendorProfile->business_name,
                'status' => $user->vendorProfile->status,
                'ssm_number' => $user->vendorProfile->ssm_number,
                'business_started_at' => $user->vendorProfile->business_started_at,
                'service_area_state' => $user->vendorProfile->service_area_state,
                'service_area_town' => $user->vendorProfile->service_area_town,
            ] : null,
            'services' => $user->serviceProfiles->map(fn ($service) => [
                'id' => $service->id,
                'name' => $service->service_name,
                'category' => $service->service_category,
                'status' => $service->status,
                'is_active' => $service->is_active,
                'starting_price' => (float) $service->pricing_starting_from,
                'created_at' => $service->created_at->toDateTimeString(),
            ]),
            'booking_summary' => [
                'made' => $this->bookingStatusSummary(clone $madeBookings),
                'received' => $this->bookingStatusSummary(clone $receivedBookings),
            ],
            'recent_bookings' => $recentMade
                ->concat($recentReceived)
                ->sortByDesc('created_at')
                ->take(8)
                ->values(),
            'moderation_history' => $user->moderationActions->map(fn (UserModerationAction $action) => [
                'id' => $action->id,
                'action' => $action->action,
                'previous_status' => $action->previous_status,
                'new_status' => $action->new_status,
                'reason' => $action->reason,
                'created_at' => $action->created_at->toDateTimeString(),
                'admin' => $action->admin ? [
                    'id' => $action->admin->id,
                    'name' => $action->admin->name,
                    'role' => $action->admin->role,
                ] : null,
            ]),
            'permissions' => $permissions,
        ]);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        if ($blockedReason = $this->moderationBlockReason($request->user(), $user)) {
            return response()->json(['message' => $blockedReason], 403);
        }

        $result = DB::transaction(function () use ($request, $user, $validated) {
            $target = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($target->status !== 'active') {
                return null;
            }

            $reason = trim($validated['reason']);
            $target->update([
                'status' => 'suspended',
                'suspended_at' => now(),
                'suspension_reason' => $reason,
                'suspended_by' => $request->user()->id,
            ]);
            $target->moderationActions()->create([
                'admin_id' => $request->user()->id,
                'action' => 'suspended',
                'previous_status' => 'active',
                'new_status' => 'suspended',
                'reason' => $reason,
            ]);
            $target->tokens()->delete();

            return $target;
        });

        if (! $result) {
            return response()->json(['message' => 'Only an active account can be suspended.'], 409);
        }

        $this->notifications->accountSuspended($result, $request->user(), trim($validated['reason']));

        return response()->json([
            'message' => 'Account suspended and active sessions revoked.',
            'user' => $this->mapUser($result->fresh()),
        ]);
    }

    public function reactivate(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        if ($blockedReason = $this->moderationBlockReason($request->user(), $user)) {
            return response()->json(['message' => $blockedReason], 403);
        }

        $result = DB::transaction(function () use ($request, $user, $validated) {
            $target = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($target->status !== 'suspended') {
                return null;
            }

            $reason = trim($validated['reason']);
            $target->update([
                'status' => 'active',
                'suspended_at' => null,
                'suspension_reason' => null,
                'suspended_by' => null,
            ]);
            $target->moderationActions()->create([
                'admin_id' => $request->user()->id,
                'action' => 'reactivated',
                'previous_status' => 'suspended',
                'new_status' => 'active',
                'reason' => $reason,
            ]);

            return $target;
        });

        if (! $result) {
            return response()->json(['message' => 'Only a suspended account can be reactivated.'], 409);
        }

        $this->notifications->accountReactivated($result, $request->user(), trim($validated['reason']));

        return response()->json([
            'message' => 'Account reactivated. The user can sign in again.',
            'user' => $this->mapUser($result->fresh()),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapUser(User $user, bool $detailed = false): array
    {
        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone_number' => $user->phone_number,
            'role' => $user->role,
            'status' => $user->status,
            'avatar_url' => $user->avatar_path ? rtrim(asset('storage'), '/').'/'.ltrim($user->avatar_path, '/') : null,
            'email_verified_at' => $user->email_verified_at?->toDateTimeString(),
            'profile_completed' => $user->profile_completed,
            'last_login_at' => $user->last_login_at?->toDateTimeString(),
            'created_at' => $user->created_at->toDateTimeString(),
            'suspended_at' => $user->suspended_at?->toDateTimeString(),
            'suspension_reason' => $user->suspension_reason,
            'bookings_made_count' => (int) ($user->bookings_made_count ?? 0),
            'bookings_received_count' => (int) ($user->bookings_received_count ?? 0),
            'services_count' => (int) ($user->services_count ?? 0),
            'business_name' => $user->vendorProfile?->business_name,
            'vendor_status' => $user->vendorProfile?->status,
        ];

        if ($detailed) {
            $data['suspended_by'] = $user->suspendedBy ? [
                'id' => $user->suspendedBy->id,
                'name' => $user->suspendedBy->name,
                'role' => $user->suspendedBy->role,
            ] : null;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapBooking(Booking $booking, string $relationship): array
    {
        return [
            'id' => $booking->id,
            'reference' => 'ACR-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT),
            'relationship' => $relationship,
            'service_name' => $booking->service_name_snapshot ?: $booking->serviceProfile?->service_name,
            'counterparty' => $relationship === 'vendor' ? $booking->user?->name : $booking->vendor_name_snapshot,
            'selected_date' => $booking->selected_date->format('Y-m-d'),
            'status' => $booking->status,
            'value' => $booking->price_snapshot !== null ? (float) $booking->price_snapshot : null,
            'created_at' => $booking->created_at->toDateTimeString(),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function bookingStatusSummary($query): array
    {
        return [
            'total' => (clone $query)->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'confirmed' => (clone $query)->where('status', 'confirmed')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
            'closed' => (clone $query)->whereIn('status', ['rejected', 'cancelled', 'expired'])->count(),
        ];
    }

    /**
     * @return array{can_suspend: bool, can_reactivate: bool, blocked_reason: string|null}
     */
    private function moderationPermissions(User $actor, User $target): array
    {
        $blockedReason = $this->moderationBlockReason($actor, $target);

        return [
            'can_suspend' => $blockedReason === null && $target->status === 'active',
            'can_reactivate' => $blockedReason === null && $target->status === 'suspended',
            'blocked_reason' => $blockedReason,
        ];
    }

    private function moderationBlockReason(User $actor, User $target): ?string
    {
        if ($actor->id === $target->id) {
            return 'You cannot moderate your own account.';
        }

        if ($target->role === 'super_admin') {
            return 'Super administrator accounts cannot be suspended or reactivated here.';
        }

        if ($actor->role !== 'super_admin' && $target->role === 'admin') {
            return 'Only a super administrator can moderate an administrator account.';
        }

        return null;
    }
}
