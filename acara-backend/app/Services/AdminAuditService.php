<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AdminAuditService
{
    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        Request $request,
        string $module,
        string $action,
        string $description,
        string $subjectLabel,
        ?string $subjectReference = null,
        ?Model $subject = null,
        ?array $before = null,
        ?array $after = null,
        ?string $reason = null,
        array $metadata = [],
    ): AdminAuditLog {
        return AdminAuditLog::create([
            'actor_id' => $request->user()?->id,
            'module' => $module,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'subject_label' => $subjectLabel,
            'subject_reference' => $subjectReference,
            'description' => $description,
            'reason' => $reason,
            'before_values' => $before,
            'after_values' => $after,
            'metadata' => array_merge([
                'request_method' => $request->method(),
                'request_path' => $request->path(),
            ], $metadata),
            'ip_address' => $request->ip(),
            'user_agent' => str($request->userAgent() ?? '')->limit(500, '')->toString() ?: null,
        ]);
    }
}
