<?php

namespace App\Http\Controllers;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'module' => ['nullable', Rule::in(['all', 'users', 'vendors', 'services', 'bookings', 'administration', 'settings'])],
            'action' => ['nullable', 'string', 'max:80'],
            'actor_id' => ['nullable', 'integer', 'exists:users,id'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $this->visibleQuery($request)->with('actor:id,name,email,role');

        if ($search = trim($validated['search'] ?? '')) {
            $query->where(function ($query) use ($search) {
                $query->where('subject_label', 'like', "%{$search}%")
                    ->orWhere('subject_reference', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('actor', fn ($actor) => $actor
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        if (($validated['module'] ?? 'all') !== 'all') {
            $query->where('module', $validated['module']);
        }

        if (($validated['action'] ?? 'all') !== 'all') {
            $query->where('action', $validated['action']);
        }

        if ($request->user()->role === 'super_admin' && ! empty($validated['actor_id'])) {
            $query->where('actor_id', $validated['actor_id']);
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        $logs = $query->latest('created_at')->paginate($validated['per_page'] ?? 25);
        $statsQuery = $this->visibleQuery($request);

        return response()->json([
            'logs' => collect($logs->items())->map(fn (AdminAuditLog $log) => $this->map($log)),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
            'stats' => [
                'total' => (clone $statsQuery)->count(),
                'today' => (clone $statsQuery)->whereDate('created_at', today())->count(),
                'this_week' => (clone $statsQuery)->where('created_at', '>=', now()->startOfWeek())->count(),
                'high_impact' => (clone $statsQuery)->whereIn('action', [
                    'user_suspended',
                    'user_reactivated',
                    'service_rejected',
                    'vendor_rejected',
                    'completion_resolved',
                    'platform_settings_updated',
                ])->count(),
            ],
            'filters' => [
                'actions' => $this->visibleQuery($request)->distinct()->orderBy('action')->pluck('action'),
                'actors' => $request->user()->role === 'super_admin'
                    ? User::whereIn('role', ['admin', 'super_admin'])->orderBy('name')->get(['id', 'name', 'email', 'role'])
                    : [],
            ],
            'scope' => $request->user()->role === 'super_admin' ? 'platform' : 'own',
        ]);
    }

    public function show(Request $request, AdminAuditLog $auditLog): JsonResponse
    {
        if ($request->user()->role !== 'super_admin' && $auditLog->actor_id !== $request->user()->id) {
            abort(404);
        }

        $auditLog->load('actor:id,name,email,role');

        return response()->json([
            'log' => array_merge($this->map($auditLog), [
                'before_values' => $auditLog->before_values,
                'after_values' => $auditLog->after_values,
                'metadata' => $auditLog->metadata,
                'ip_address' => $auditLog->ip_address,
                'user_agent' => $auditLog->user_agent,
            ]),
            'scope' => $request->user()->role === 'super_admin' ? 'platform' : 'own',
        ]);
    }

    private function visibleQuery(Request $request)
    {
        return AdminAuditLog::query()
            ->when(
                $request->user()->role !== 'super_admin',
                fn ($query) => $query->where('actor_id', $request->user()->id),
            );
    }

    /**
     * @return array<string, mixed>
     */
    private function map(AdminAuditLog $log): array
    {
        return [
            'id' => $log->id,
            'reference' => 'AUD-'.str_pad((string) $log->id, 7, '0', STR_PAD_LEFT),
            'module' => $log->module,
            'action' => $log->action,
            'description' => $log->description,
            'reason' => $log->reason,
            'subject_label' => $log->subject_label,
            'subject_reference' => $log->subject_reference,
            'subject_type' => $log->subject_type,
            'subject_id' => $log->subject_id,
            'actor' => $log->actor ? [
                'id' => $log->actor->id,
                'name' => $log->actor->name,
                'email' => $log->actor->email,
                'role' => $log->actor->role,
            ] : null,
            'created_at' => $log->created_at->toDateTimeString(),
        ];
    }
}
