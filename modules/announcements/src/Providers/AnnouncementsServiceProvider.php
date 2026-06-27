<?php

namespace Modules\Announcements\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\Announcements\Models\Announcement;
use Modules\Announcements\Policies\AnnouncementPolicy;

/**
 * Announcements module service provider.
 *
 * Loads:
 *  - Routes (web: tenant feed + admin CRUD/publish)
 *  - Migrations (announcements + announcement_reads tables — GLOBAL, no RLS)
 *  - Policy (AnnouncementPolicy for tenant-plane view/markRead authorization)
 */
class AnnouncementsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // No module-specific bindings needed for v1.
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        $this->loadWebRoutes();

        // Register policy: tenant-plane view/markRead authorization.
        // Admin-plane CRUD is gated by admin.can middleware on routes, not this policy.
        Gate::policy(Announcement::class, AnnouncementPolicy::class);
    }

    private function loadWebRoutes(): void
    {
        $path = __DIR__.'/../../routes/web.php';
        if (file_exists($path)) {
            Route::middleware('web')->group($path);
        }
    }
}
