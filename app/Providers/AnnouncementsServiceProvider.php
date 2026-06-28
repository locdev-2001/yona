<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Policies\AnnouncementPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * Announcements feature service provider.
 *
 * Loads:
 *  - Policy (AnnouncementPolicy for tenant-plane view/markRead authorization)
 *
 * Migrations: now in database/migrations/ (run by default — loadMigrationsFrom removed).
 * Routes: merged into routes/web.php (tenant) and routes/admin.php (admin CRUD).
 *
 * Admin-plane CRUD is gated by admin.can middleware on routes, not this policy.
 */
class AnnouncementsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // No module-specific bindings needed for v1.
    }

    public function boot(): void
    {
        // Register policy: tenant-plane view/markRead authorization.
        // Admin-plane CRUD is gated by admin.can middleware on routes, not this policy.
        Gate::policy(Announcement::class, AnnouncementPolicy::class);
    }
}
