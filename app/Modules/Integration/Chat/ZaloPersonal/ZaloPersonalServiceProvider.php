<?php

namespace App\Modules\Integration\Chat\ZaloPersonal;

use App\Http\Middleware\VerifyZaloBridgeSecret;
use App\Modules\Integration\ChannelManager;
use App\Services\MeteringService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Service provider cho Zalo personal channel driver (sống trong Integration module).
 *
 * Đăng ký:
 *   - ZaloSendService (singleton — ZaloHealthMonitor + SendRateLimiter + MeteringService)
 *   - ZaloChannelDriver vào ChannelManager (extend 'zalo_personal')
 *   - Middleware alias 'zalo.bridge.secret'
 *   - API routes (webhook receiver)
 *   - Settings routes (ZaloConnectionController — auth+workspace gate)
 *
 * Re-home: được IntegrationServiceProvider register (KHÔNG còn module framework auto-discovery).
 * Internal-first: xóa app/Modules/Integration/ → provider + driver + routes biến mất cùng nhau.
 *
 * Migrations KHÔNG load ở đây — đã chuyển sang database/migrations/ (Laravel thuần).
 *
 * @see \App\Modules\Integration\ChannelManager
 * @see \App\Modules\Integration\IntegrationServiceProvider
 */
class ZaloPersonalServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Singleton services — stateless giữa request; ZaloHealthMonitor + SendRateLimiter dùng Cache.
        $this->app->singleton(ZaloHealthMonitor::class, fn () => new ZaloHealthMonitor());
        $this->app->singleton(SendRateLimiter::class, fn () => new SendRateLimiter());

        $this->app->singleton(ZaloSendService::class, function ($app) {
            return new ZaloSendService(
                rateLimiter:     $app->make(SendRateLimiter::class),
                healthMonitor:   $app->make(ZaloHealthMonitor::class),
                meteringService: $app->make(MeteringService::class),
            );
        });

        // Đăng ký ZaloChannelDriver vào ChannelManager singleton.
        // Internal-first: ChannelManager sống cùng module Integration → luôn tồn tại khi provider này chạy.
        // Dùng app() helper trong closure (KHÔNG $this->app — binding context khác).
        $this->callAfterResolving(ChannelManager::class, function (ChannelManager $manager) {
            $manager->extend('zalo_personal', fn () => app(ZaloChannelDriver::class));
        });
    }

    public function boot(): void
    {
        $this->registerMiddlewareAlias();
        $this->loadApiRoutes();
        $this->loadSettingsRoutes();
    }

    private function registerMiddlewareAlias(): void
    {
        /** @var \Illuminate\Routing\Router $router */
        $router = $this->app['router'];
        $router->aliasMiddleware('zalo.bridge.secret', VerifyZaloBridgeSecret::class);
    }

    private function loadApiRoutes(): void
    {
        $path = __DIR__.'/routes/api.php';
        if (file_exists($path)) {
            Route::middleware('api')->prefix('api')->group($path);
        }
    }

    private function loadSettingsRoutes(): void
    {
        $path = __DIR__.'/routes/settings.php';
        if (file_exists($path)) {
            $this->loadRoutesFrom($path);
        }
    }
}
