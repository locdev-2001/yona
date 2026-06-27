<?php

namespace Modules\Identity\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Identity\Models\Team;
use Modules\Identity\Models\User;
use Modules\Identity\Policies\TeamPolicy;

/**
 * Identity core module service provider.
 *
 * Loads:
 *  - Migrations: users/admins/teams/team_closure/audit_logs + spatie permission tables + RLS
 *  - Policies: TeamPolicy
 *
 * Middleware aliases (admin.scope, admin.can, no.impersonation) stay in
 * bootstrap/app.php — only class paths are updated there to point to this module.
 *
 * Depends on: tenancy (workspace context must be established first).
 */
class IdentityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Shim classes app/Models/User.php and app/Models/Admin.php extend the
        // moved models so config/auth.php resolves without modification.
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        Gate::policy(Team::class, TeamPolicy::class);
    }
}
