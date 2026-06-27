<?php

namespace Modules\CrmSales\Providers;

use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\CrmSales\Contracts\ContactRepository;
use Modules\CrmSales\Contracts\LeadCreator;
use Modules\CrmSales\Events\LeadAssigned;
use Modules\CrmSales\Listeners\SendLeadAssignedNotification;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\ClientGroup;
use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Models\Lead;
use Modules\CrmSales\Models\LeadSource;
use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Policies\ClientPolicy;
use Modules\CrmSales\Policies\ContactPolicy;
use Modules\CrmSales\Policies\LeadPolicy;
use Modules\CrmSales\Policies\LeadSourcePolicy;
use Modules\CrmSales\Policies\PipelinePolicy;
use Modules\CrmSales\Services\ContactRepositoryImpl;
use Modules\CrmSales\Services\LeadCreatorImpl;

/**
 * CRM-Sales feature module service provider.
 *
 * Loads:
 *  - Migrations: clients/contacts/groups/vault/leads/pipelines/stages/sources + RLS
 *  - Policies: Client, Contact, ClientGroup, Lead, Pipeline, LeadSource
 *  - Events: LeadAssigned → SendLeadAssignedNotification
 *  - Contracts: ContactRepository → ContactRepositoryImpl, LeadCreator → LeadCreatorImpl
 *
 * Depends on: tenancy, identity, shared, cdp.
 */
class CrmSalesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind contracts → implementations (phơi cho Phase 07: inbox + cdp)
        $this->app->bind(ContactRepository::class, ContactRepositoryImpl::class);
        $this->app->bind(LeadCreator::class, LeadCreatorImpl::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        // Policies
        Gate::policy(Client::class, ClientPolicy::class);
        Gate::policy(Contact::class, ContactPolicy::class);
        Gate::policy(ClientGroup::class, ClientPolicy::class); // groups use client permission
        Gate::policy(Lead::class, LeadPolicy::class);
        Gate::policy(Pipeline::class, PipelinePolicy::class);
        Gate::policy(LeadSource::class, LeadSourcePolicy::class);

        // Events
        Event::listen(LeadAssigned::class, SendLeadAssignedNotification::class);
    }
}
