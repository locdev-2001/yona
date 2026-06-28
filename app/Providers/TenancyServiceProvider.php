<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Policies\WorkspaceMemberPolicy;
use App\Policies\WorkspacePolicy;

/**
 * Tenancy service provider.
 *
 * Registers:
 *  - Policies: WorkspacePolicy, WorkspaceMemberPolicy
 *
 * Migrations live in database/migrations/ (Laravel auto-discovers them).
 * Middleware (ResetTenantContext, IdentifyWorkspace aliases) is registered in
 * bootstrap/app.php — framework-level with strict ordering requirements.
 */
class TenancyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Workspace::class, WorkspacePolicy::class);
        Gate::policy(WorkspaceMember::class, WorkspaceMemberPolicy::class);
    }
}
