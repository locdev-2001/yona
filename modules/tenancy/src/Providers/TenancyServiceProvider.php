<?php

namespace Modules\Tenancy\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use Modules\Tenancy\Policies\WorkspaceMemberPolicy;
use Modules\Tenancy\Policies\WorkspacePolicy;

/**
 * Tenancy core module service provider.
 *
 * Loads:
 *  - Migrations: workspace/workspace_member/workspace_sequences/workspace_settings tables + their RLS policies
 *  - Policies: WorkspacePolicy, WorkspaceMemberPolicy
 *
 * Note: Middleware registration (ResetTenantContext, IdentifyWorkspace aliases) stays in
 * bootstrap/app.php — these are framework-level middleware with strict ordering requirements.
 * ONLY the class paths are updated there to point to this module.
 */
class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // No module-specific container bindings needed — TenantScope is used statically.
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        Gate::policy(Workspace::class, WorkspacePolicy::class);
        Gate::policy(WorkspaceMember::class, WorkspaceMemberPolicy::class);
    }
}
