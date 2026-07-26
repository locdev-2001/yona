<?php

namespace App\Providers;

use App\Contracts\EntityMergeFields;
use App\Events\ConversationPhoneLearned;
use App\Events\LeadAssigned;
use App\Listeners\LinkContactFromConversationPhone;
use App\Listeners\SendLeadAssignedNotification;
use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\Pipeline;
use App\Policies\ClientPolicy;
use App\Policies\ContactPolicy;
use App\Policies\LeadPolicy;
use App\Policies\LeadSourcePolicy;
use App\Policies\PipelinePolicy;
use App\Services\MergeFields\ClientMergeFields;
use App\Services\MergeFields\ContactMergeFields;
use App\Services\MergeFields\LeadMergeFields;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * CRM-Sales feature service provider.
 * loadMigrationsFrom removed — migrations now in database/migrations/ (run by default).
 */
class CrmSalesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // ContactService + LeadService auto-resolve (concrete classes, no contracts).

        // P06 — Reverse-registry: tag crm-sales merge-field providers so EmailServiceProvider
        // picks them up via $app->tagged(EntityMergeFields::class).
        $this->app->tag([
            LeadMergeFields::class,
            ClientMergeFields::class,
            ContactMergeFields::class,
        ], EntityMergeFields::class);
    }

    public function boot(): void
    {
        // Policies
        Gate::policy(Client::class, ClientPolicy::class);
        Gate::policy(Contact::class, ContactPolicy::class);
        Gate::policy(ClientGroup::class, ClientPolicy::class);
        Gate::policy(Lead::class, LeadPolicy::class);
        Gate::policy(Pipeline::class, PipelinePolicy::class);
        Gate::policy(LeadSource::class, LeadSourcePolicy::class);

        // Events
        Event::listen(LeadAssigned::class, SendLeadAssignedNotification::class);

        // Chat chỉ báo "vừa biết số này"; dựng và gộp hồ sơ khách là việc của CRM.
        Event::listen(ConversationPhoneLearned::class, LinkContactFromConversationPhone::class);
    }
}
