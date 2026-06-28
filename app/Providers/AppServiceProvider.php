<?php

namespace App\Providers;

use App\Support\ModuleAwareInertiaViewFinder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use App\Models\EmailTemplate;
use App\Policies\EmailTemplatePolicy;
use App\Models\User;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Transition shim app/Support/legacy-aliases.php (aliases old Modules\
        // {Identity,Tenancy,Shared}\ class names to their App\ locations) is loaded
        // via composer autoload "files" so the aliases exist before ANY class
        // compiles (including PHPUnit-discovered test stubs). Removed in a later phase.

        // Override Inertia's view-finder to resolve Modules.X.page convention.
        // Modules.{Module}.{page} → modules/{kebab}/resources/js/pages/{page}.tsx
        $this->app->bind('inertia.view-finder', function ($app) {
            return new ModuleAwareInertiaViewFinder(
                $app['files'],
                $app['config']->get('inertia.pages.paths'),
                $app['config']->get('inertia.pages.extensions'),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Defense-in-depth: block destructive DB commands (migrate:fresh / migrate:refresh
        // / migrate:reset / db:wipe) everywhere EXCEPT the test suite, which legitimately
        // rebuilds its own throwaway DB. A careless `migrate:fresh --seed` against the dev
        // DB once wiped local data. To run one intentionally, set DB_ALLOW_DESTRUCTIVE=true.
        if (! $this->app->runningUnitTests()) {
            DB::prohibitDestructiveCommands(! env('DB_ALLOW_DESTRUCTIVE', false));
        }

        // Workspace admin/owner has unrestricted access WITHIN their workspace.
        // Cross-workspace isolation is still enforced by Postgres RLS + the
        // BelongsToWorkspace scope, so this only removes per-feature permission
        // gating: a workspace admin automatically gains any NEW permission with
        // zero re-seeding. Returns null (falls through to normal policy/permission
        // checks) for every non-admin member.
        Gate::before(function ($user, string $ability): ?bool {
            if ($user instanceof User && currentMembership()?->role === 'admin') {
                return true;
            }

            return null;
        });

        // P06 — EmailTemplatePolicy registered here as backup (EmailServiceProvider is primary).
        // crm-sales policies + events registered in CrmSalesServiceProvider.
        // Project + Task policies registered in ProjectsServiceProvider.
        Gate::policy(EmailTemplate::class, EmailTemplatePolicy::class);
    }
}
