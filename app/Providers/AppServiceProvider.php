<?php

namespace App\Providers;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Modules\Integration\IntegrationServiceProvider;
use App\Policies\EmailTemplatePolicy;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Internal-first: register Integration module nếu nó tồn tại. Xóa thư mục
        // app/Modules/Integration/ → class_exists false → skip → inbox/billing core
        // vẫn build/chạy (không fatal). KHÔNG hard-reference trong bootstrap/providers.php.
        if (class_exists(IntegrationServiceProvider::class)) {
            $this->app->register(IntegrationServiceProvider::class);
        }
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
            DB::prohibitDestructiveCommands(! config('database.allow_destructive'));
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
