<?php

namespace App\Providers;

use App\Models\Conversation;
use App\Policies\ConversationPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * Inbox-core service provider (moved from Modules\Inbox).
 *
 * Migrations now in database/migrations/ (run by default — loadMigrationsFrom removed).
 * Routes merged into routes/web.php + routes/channels.php.
 * ChannelManager registry moved to App\Modules\Integration\IntegrationServiceProvider.
 * Metering moved to App\Services\MeteringService (concrete — no binding needed).
 */
class InboxServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Conversation::class, ConversationPolicy::class);
    }
}
