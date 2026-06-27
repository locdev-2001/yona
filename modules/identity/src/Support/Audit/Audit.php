<?php

namespace Modules\Identity\Support\Audit;

use Modules\Identity\Models\AuditLog;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes append-only audit entries (BR-X05).
 *
 * Connection: workspace-scoped entries are written on the runtime connection,
 * where cho_rach_app has INSERT but no UPDATE/DELETE on audit_logs
 * (setup-roles.sql) — immutability is grant-enforced, not just app-enforced.
 * Platform-plane entries (no workspace_id: login, impersonation, …) cannot
 * satisfy the audit_logs RLS WITH CHECK, so they are written on the privileged
 * connection (which also bypasses RLS); their immutability rests on the model
 * guard + the absence of any update path.
 *
 * Diffs are PII-minimized (BR-X07): a model lists PII attributes via
 * auditPiiAttributes(); those are stored as a stable reference, never the raw
 * value, so PII can be erased at source without rewriting history.
 */
class Audit
{
    /**
     * @param  array<string, mixed>|null  $changes
     */
    public static function log(Model $model, string $action, ?array $changes = null): void
    {
        $workspaceId = self::workspaceId($model);
        $actor = self::resolveActor();

        // Platform-plane writes go through the privileged role: entries with no
        // workspace, or an admin actor (whose request RLS context is the reserved
        // platform scope, not this row's workspace), cannot satisfy the
        // audit_logs RLS WITH CHECK on the runtime connection.
        $privileged = $workspaceId === null || $actor['actor_type'] === 'admin';

        AuditLog::on($privileged ? 'pgsql_privileged' : null)->forceCreate([
            'workspace_id' => $workspaceId,
            'entity_type' => $model->getMorphClass(),
            'entity_id' => (string) $model->getKey(),
            'action' => $action,
            ...$actor,
            'changes' => $changes ?? self::diff($model, $action),
            'context' => self::context(),
            'occurred_at' => now(),
        ]);
    }

    /**
     * Resolve actor fields based on the active guard.
     *
     * admin guard (no impersonation): actor_type='admin', actor_admin_id=admin id, actor_id=null.
     * web guard (possibly impersonating): actor_type='user', actor_id=user id,
     *   impersonated_by_admin_id from session (null when not impersonating).
     * otherwise: actor_type='system', all actor ids null.
     *
     * @return array<string, mixed>
     */
    private static function resolveActor(): array
    {
        if (auth('admin')->check() && ! session()->has('impersonator_admin_id')) {
            return [
                'actor_type' => 'admin',
                'actor_admin_id' => auth('admin')->id(),
                'actor_id' => null,
                'impersonated_by_admin_id' => null,
            ];
        }

        if (auth('web')->check()) {
            return [
                'actor_type' => 'user',
                'actor_id' => auth('web')->id(),
                'actor_admin_id' => null,
                'impersonated_by_admin_id' => session('impersonator_admin_id'),
            ];
        }

        return [
            'actor_type' => 'system',
            'actor_id' => null,
            'actor_admin_id' => null,
            'impersonated_by_admin_id' => null,
        ];
    }

    private static function workspaceId(Model $model): ?string
    {
        if (array_key_exists('workspace_id', $model->getAttributes())) {
            return $model->getAttribute('workspace_id');
        }

        if ($model instanceof Workspace) {
            return $model->getKey();
        }

        return currentWorkspace()?->id;
    }

    /**
     * @return array<string, mixed>
     */
    private static function diff(Model $model, string $action): array
    {
        $pii = method_exists($model, 'auditPiiAttributes') ? $model->auditPiiAttributes() : [];
        $skip = ['lock_version', 'updated_at', 'created_at'];

        if ($action === 'update') {
            $changes = [];
            foreach ($model->getChanges() as $key => $new) {
                if (in_array($key, $skip, true)) {
                    continue;
                }
                $changes[$key] = ['old' => $model->getOriginal($key), 'new' => $new];
            }
        } elseif ($action === 'create') {
            $changes = collect($model->getAttributes())->except($skip)->all();
        } else {
            $changes = ['id' => $model->getKey()];
        }

        foreach ($pii as $field) {
            if (array_key_exists($field, $changes)) {
                $changes[$field] = ['ref' => (string) $model->getKey()];
            }
        }

        return $changes;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function context(): ?array
    {
        if (app()->runningInConsole()) {
            return null;
        }

        $request = request();
        $context = array_filter([
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent() ? mb_substr($request->userAgent(), 0, 255) : null,
        ]);

        return $context ?: null;
    }
}
