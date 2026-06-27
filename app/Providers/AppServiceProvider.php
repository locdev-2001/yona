<?php

namespace App\Providers;

use App\Models\EmailTemplate;
use App\Policies\EmailTemplatePolicy;
use App\Services\MergeFields\ClientMergeFields;
use App\Services\MergeFields\ContactMergeFields;
use App\Services\MergeFields\Contracts\EntityMergeFields;
use App\Services\MergeFields\LeadMergeFields;
use App\Services\MergeFields\MergeFieldResolver;
use App\Support\ModuleAwareInertiaViewFinder;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Identity\Models\User;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // P05 — Register entity merge-field resolvers as a tagged group.
        $this->app->tag([
            LeadMergeFields::class,
            ClientMergeFields::class,
            ContactMergeFields::class,
        ], EntityMergeFields::class);

        // Bind MergeFieldResolver with all tagged resolvers injected.
        $this->app->singleton(MergeFieldResolver::class, function ($app) {
            return new MergeFieldResolver($app->tagged(EntityMergeFields::class));
        });

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

        // P05 — Register EmailTemplatePolicy (auto-discovery backup).
        Gate::policy(EmailTemplate::class, EmailTemplatePolicy::class);

        // Project + Task policies registered in ProjectsServiceProvider (modules/projects).
        // crm-sales policies + events are registered in CrmSalesServiceProvider.
    }
}
