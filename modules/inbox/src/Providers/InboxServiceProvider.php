<?php

namespace Modules\Inbox\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\Inbox\Channel\AllowAllMeteringGate;
use Modules\Inbox\Channel\ChannelManager;
use Modules\Inbox\Contracts\MeteringGate;

/**
 * Inbox feature module service provider.
 *
 * Loads:
 *  - Migrations: conversations, messages, RLS
 *  - Contracts: MeteringGate → AllowAllMeteringGate (no-op default, disable-safe)
 *  - Singleton: ChannelManager (driver registry cho channel modules)
 *
 * F6/F10: MeteringGate bind no-op trong register() — billing ServiceProvider
 * override sau (billing depends:["inbox"] → topo-sort đảm bảo billing boot sau inbox).
 * Tắt billing → AllowAllMeteringGate → canStartNew=true, gửi/nhận bình thường.
 *
 * Depends on: tenancy, identity, shared, cdp, crm-sales.
 */
class InboxServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // F6/F10: no-op default — billing override sau topo-sort
        $this->app->bind(MeteringGate::class, AllowAllMeteringGate::class);

        // ChannelManager: singleton driver registry
        $this->app->singleton(ChannelManager::class, function ($app) {
            return new ChannelManager($app);
        });
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        $this->loadWebRoutes();
        $this->loadApiRoutes();
        $this->loadChannelRoutes();
    }

    private function loadWebRoutes(): void
    {
        $path = __DIR__.'/../../routes/web.php';
        if (file_exists($path)) {
            Route::middleware('web')->group($path);
        }
    }

    private function loadApiRoutes(): void
    {
        $path = __DIR__.'/../../routes/api.php';
        if (file_exists($path)) {
            Route::middleware('api')->prefix('api')->group($path);
        }
    }

    private function loadChannelRoutes(): void
    {
        $path = __DIR__.'/../../routes/channels.php';
        if (file_exists($path)) {
            require $path;
        }
    }
}
