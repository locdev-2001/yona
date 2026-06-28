<?php

namespace App\Providers;

use App\Models\Team;
use App\Policies\TeamPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * Identity service provider.
 *
 * Registers:
 *  - Policies: TeamPolicy
 *
 * Migrations live in database/migrations/ (Laravel auto-discovers them).
 * Middleware aliases (admin.scope, admin.can, no.impersonation) are registered
 * in bootstrap/app.php.
 *
 * Depends on: tenancy (workspace context must be established first).
 */
class IdentityServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Team::class, TeamPolicy::class);
    }
}
