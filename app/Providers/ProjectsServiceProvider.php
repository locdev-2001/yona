<?php

namespace App\Providers;

use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Task;
use App\Policies\ProjectPolicy;
use App\Policies\ProjectStatusPolicy;
use App\Policies\TaskPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * Projects module service provider (App\ namespace, Phase 1c).
 * Migrations are now in database/migrations/ — loadMigrationsFrom removed.
 * Gate policies registered here for Project, ProjectStatus, Task.
 */
class ProjectsServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(ProjectStatus::class, ProjectStatusPolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);
    }
}
