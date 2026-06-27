<?php

namespace Modules\Email\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Email\Contracts\EntityMergeFields;
use Modules\Email\Models\EmailTemplate;
use Modules\Email\Policies\EmailTemplatePolicy;
use Modules\Email\Services\MergeFieldResolver;

/**
 * P06 — Email feature module service provider.
 *
 * Loads:
 *  - Migrations: email_templates + RLS
 *  - Policy: EmailTemplate
 *  - Singleton: MergeFieldResolver (tagged entity resolvers injected)
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
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');
        $this->loadRoutesFrom(__DIR__.'/../../routes/web.php');

        Gate::policy(EmailTemplate::class, EmailTemplatePolicy::class);
    }
}
