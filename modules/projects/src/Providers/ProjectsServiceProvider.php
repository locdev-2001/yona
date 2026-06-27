<?php

namespace Modules\Projects\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Projects\Models\Project;
use Modules\Projects\Models\ProjectStatus;
use Modules\Projects\Models\Task;
use Modules\Projects\Policies\ProjectPolicy;
use Modules\Projects\Policies\ProjectStatusPolicy;
use Modules\Projects\Policies\TaskPolicy;

/**
 * Projects feature module service provider.
 *
 * Loads:
 *  - Migrations: projects/milestones/members/discussions/statuses + tasks/assignees/followers/checklist/timers + RLS
 *  - Policies: Project, ProjectStatus, Task
 *
 * Depends on: tenancy, identity, shared, cdp, crm-sales.
 * Project.client_id → crm-sales.clients (DB-level FK; no Model import here — morph alias only).
 */
class ProjectsServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        // Policies
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(ProjectStatus::class, ProjectStatusPolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);
    }
}
