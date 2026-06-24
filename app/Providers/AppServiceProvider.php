<?php

namespace App\Providers;

use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\Contact;
use App\Models\EmailTemplate;
use App\Policies\ClientPolicy;
use App\Policies\ContactPolicy;
use App\Policies\EmailTemplatePolicy;
use App\Services\MergeFields\ClientMergeFields;
use App\Services\MergeFields\ContactMergeFields;
use App\Services\MergeFields\Contracts\EntityMergeFields;
use App\Services\MergeFields\LeadMergeFields;
use App\Services\MergeFields\MergeFieldResolver;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // P05 — Register EmailTemplatePolicy (auto-discovery backup).
        Gate::policy(EmailTemplate::class, EmailTemplatePolicy::class);

        // P06 — Client / Contact / ClientGroup policies.
        Gate::policy(Client::class, ClientPolicy::class);
        Gate::policy(Contact::class, ContactPolicy::class);
        Gate::policy(ClientGroup::class, ClientPolicy::class); // groups use client permission
    }
}
