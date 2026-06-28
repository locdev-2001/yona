<?php

namespace App\Providers;

use App\Contracts\EntityMergeFields;
use App\Models\EmailTemplate;
use App\Policies\EmailTemplatePolicy;
use App\Services\MergeFieldResolver;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * P06 — Email feature service provider (moved from Modules\Email\Providers).
 *
 * Loads:
 *  - Policy: EmailTemplate
 *  - Singleton: MergeFieldResolver (tagged entity resolvers injected)
 *
 * Migrations: now in database/migrations/ (run by default — loadMigrationsFrom removed).
 * Routes: merged into routes/settings.php.
 *
 * Depends on: tenancy, identity, shared.
 * Feature modules (crm-sales) register their merge-field providers via
 * MergeFieldResolver::register() in their own ServiceProviders.
 */
class EmailServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Singleton registry — feature modules call register() on boot to add their providers.
        // ponytail: tagged binding allows crm-sales to push providers without email knowing them.
        $this->app->singleton(MergeFieldResolver::class, function ($app) {
            return new MergeFieldResolver($app->tagged(EntityMergeFields::class));
        });

        // Bridge the legacy alias string key → same singleton instance.
        // class_alias() only aliases the PHP class; the container keys by string.
        // Tests and callers using "use Modules\Email\Services\MergeFieldResolver" resolve
        // ::class to the OLD string, so we alias the container binding too.
        $this->app->alias(MergeFieldResolver::class, 'Modules\Email\Services\MergeFieldResolver');
        $this->app->alias(EntityMergeFields::class, 'Modules\Email\Contracts\EntityMergeFields');
    }

    public function boot(): void
    {
        Gate::policy(EmailTemplate::class, EmailTemplatePolicy::class);
    }
}
