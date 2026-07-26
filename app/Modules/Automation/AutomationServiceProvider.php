<?php

namespace App\Modules\Automation;

use App\Modules\Automation\Handlers\ChangeLeadStageNodeHandler;
use App\Modules\Automation\Handlers\ConditionNodeHandler;
use App\Modules\Automation\Handlers\CreateTaskNodeHandler;
use App\Modules\Automation\Handlers\EndNodeHandler;
use App\Modules\Automation\Handlers\NotifyInternalNodeHandler;
use App\Modules\Automation\Handlers\SendMessageNodeHandler;
use App\Modules\Automation\Handlers\TagNodeHandler;
use App\Modules\Automation\Handlers\WaitNodeHandler;
use App\Services\EntitlementService;
use Illuminate\Support\ServiceProvider;

/**
 * Automation module — registry cho node handlers (Manager pattern, như
 * IntegrationServiceProvider/ChannelRegistry). Flow handlers (Phase 02) +
 * action handlers (Phase 03) — action handlers resolve via app() so their
 * constructor-injected services (TaskService, NotificationService, ...) are
 * auto-wired by the container.
 */
class AutomationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(NodeHandlerManager::class, function ($app) {
            $manager = new NodeHandlerManager($app);

            $manager->extend('condition', fn () => new ConditionNodeHandler);
            $manager->extend('wait', fn () => new WaitNodeHandler);
            $manager->extend('end', fn () => new EndNodeHandler);

            $manager->extend('send_message', fn ($app) => $app->make(SendMessageNodeHandler::class));
            $manager->extend('create_task', fn ($app) => $app->make(CreateTaskNodeHandler::class));
            $manager->extend('notify_internal', fn ($app) => $app->make(NotifyInternalNodeHandler::class));
            $manager->extend('tag', fn ($app) => $app->make(TagNodeHandler::class));
            $manager->extend('change_lead_stage', fn ($app) => $app->make(ChangeLeadStageNodeHandler::class));

            return $manager;
        });

        $this->app->singleton(
            WorkflowEngine::class,
            fn ($app) => new WorkflowEngine(
                $app->make(NodeHandlerManager::class),
                $app->make(EntitlementService::class),
            )
        );
    }

    // No boot()/Event::listen() here: app/Listeners/EvaluateWorkflowTriggers.php's
    // handle(LeadCreated|LeadAssigned|LeadStageChanged|MessageReceived $event)
    // is picked up by Laravel's event auto-discovery (this app has no
    // EventServiceProvider disabling it) — registering it again explicitly
    // here caused the SAME event to fire the listener twice (verified via
    // Event::getRawListeners(), which showed both
    // "EvaluateWorkflowTriggers" and "EvaluateWorkflowTriggers@handle" for
    // LeadCreated — two distinct string keys Laravel does not deduplicate).
}
