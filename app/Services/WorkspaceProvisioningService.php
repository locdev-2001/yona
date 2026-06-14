<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

/**
 * Provisions a new Workspace for a given owner in one atomic transaction.
 * Reusable from HTTP, console, queue, or AI contexts — no request coupling.
 *
 * Enforces BR-X12: membership fields are property-assigned, never mass-assigned.
 * Establishes RLS context (app.current_workspace + spatie team scope) before
 * any workspace-scoped writes so Postgres RLS WITH CHECK accepts the inserts.
 */
class WorkspaceProvisioningService
{
    public function __construct(private readonly PermissionRegistrar $registrar) {}

    /**
     * Create a Workspace owned by $owner, add them as admin member, and return it.
     *
     * @param  string|null  $workspaceName  Falls back to owner's display name.
     */
    public function createForOwner(User $owner, ?string $workspaceName = null): Workspace
    {
        return DB::transaction(function () use ($owner, $workspaceName): Workspace {
            $name = $workspaceName ?: $owner->name;
            $slug = $this->uniqueSlug($name);

            $workspace = new Workspace;
            $workspace->name = $name;
            $workspace->slug = $slug;
            $workspace->base_currency = 'VND';
            $workspace->timezone = 'Asia/Ho_Chi_Minh';
            $workspace->locale = 'vi';
            $workspace->audit_retention = '1y';
            $workspace->status = 'active';
            $workspace->created_by = $owner->id;
            $workspace->save();

            // Establish RLS context so the workspace_member INSERT passes
            // the RLS WITH CHECK policy (mirrors FoundationSeeder pattern).
            app()->instance('currentWorkspace', $workspace);
            DB::statement("select set_config('app.current_workspace', ?, false)", [$workspace->id]);
            $this->registrar->setPermissionsTeamId($workspace->id);

            $member = new WorkspaceMember;
            $member->workspace_id = $workspace->id;
            $member->user_id = $owner->id;
            $member->role = 'admin';
            $member->status = 'active';
            $member->joined_at = now();
            $member->save();

            $owner->syncRoles(['admin']);

            return $workspace;
        });
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);

        if (! Workspace::withTrashed()->where('slug', $base)->exists()) {
            return $base;
        }

        do {
            $candidate = $base.'-'.Str::lower(Str::random(5));
        } while (Workspace::withTrashed()->where('slug', $candidate)->exists());

        return $candidate;
    }
}
