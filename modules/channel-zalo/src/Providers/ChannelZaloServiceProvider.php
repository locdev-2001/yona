<?php

namespace Modules\ChannelZalo\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\ChannelZalo\Http\Middleware\VerifyZaloBridgeSecret;
use Modules\ChannelZalo\Services\ZaloChannelDriver;
use Modules\Inbox\Channel\ChannelManager;

/**
 * Service provider cho channel-zalo driver module.
 *
 * Đăng ký:
 *   - ZaloChannelDriver vào ChannelManager (extend 'zalo_personal')
 *   - Middleware alias 'zalo.bridge.secret'
 *   - Migrations (zalo_connections + sequence + RLS)
 *   - API routes (webhook receiver)
 *
 * N1 cô lập: chỉ phụ thuộc inbox Contracts + inbox Channel (ChannelManager).
 * KHÔNG import billing, crm-sales, cdp models cụ thể.
 *
 * @see modules/inbox/src/Channel/ChannelManager.php
 */
class ChannelZaloServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Đăng ký ZaloChannelDriver vào ChannelManager singleton
        $this->callAfterResolving(ChannelManager::class, function (ChannelManager $manager) {
            $manager->extend('zalo_personal', fn () => new ZaloChannelDriver());
        });
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        $this->registerMiddlewareAlias();
        $this->loadApiRoutes();
    }

    private function registerMiddlewareAlias(): void
    {
        /** @var \Illuminate\Routing\Router $router */
        $router = $this->app['router'];
        $router->aliasMiddleware('zalo.bridge.secret', VerifyZaloBridgeSecret::class);
    }

    private function loadApiRoutes(): void
    {
        $path = __DIR__.'/../../routes/api.php';
        if (file_exists($path)) {
            Route::middleware('api')->prefix('api')->group($path);
        }
    }
}
