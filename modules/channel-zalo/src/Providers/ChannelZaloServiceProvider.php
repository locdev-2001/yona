<?php

namespace Modules\ChannelZalo\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\ChannelZalo\Http\Controllers\Settings\ZaloConnectionController;
use Modules\ChannelZalo\Http\Middleware\VerifyZaloBridgeSecret;
use Modules\ChannelZalo\Services\AccountHealthMonitor;
use Modules\ChannelZalo\Services\SendRateLimiter;
use App\Modules\Integration\ChannelManager;
use App\Services\MeteringService;
use Modules\ChannelZalo\Services\ZaloChannelDriver;
use Modules\ChannelZalo\Services\ZaloSendService;

/**
 * Service provider cho channel-zalo driver module.
 *
 * Đăng ký:
 *   - ZaloSendService (singleton — AccountHealthMonitor + SendRateLimiter + MeteringService)
 *   - ZaloChannelDriver vào ChannelManager (extend 'zalo_personal')
 *   - Middleware alias 'zalo.bridge.secret'
 *   - Migrations (zalo_connections + sequence + RLS)
 *   - API routes (webhook receiver)
 *   - Settings routes (ZaloConnectionController — auth+workspace gate)
 *
 * N1 cô lập: chỉ phụ thuộc App\Modules\Integration (ChannelManager) + App\Services\MeteringService.
 * KHÔNG import crm-sales models cụ thể.
 *
 * @see \App\Modules\Integration\ChannelManager
 */
class ChannelZaloServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Singleton services — stateless giữa request; AccountHealthMonitor + SendRateLimiter dùng Cache.
        $this->app->singleton(AccountHealthMonitor::class, fn () => new AccountHealthMonitor());
        $this->app->singleton(SendRateLimiter::class, fn () => new SendRateLimiter());

        $this->app->singleton(ZaloSendService::class, function ($app) {
            return new ZaloSendService(
                rateLimiter:    $app->make(SendRateLimiter::class),
                healthMonitor:  $app->make(AccountHealthMonitor::class),
                meteringService: $app->make(MeteringService::class),
            );
        });

        // Đăng ký ZaloChannelDriver vào ChannelManager singleton.
        // Internal-first: ChannelManager sống trong app/Modules/Integration/. Xóa thư mục đó
        // → class vắng → bỏ qua đăng ký driver (KHÔNG fatal). Dùng string literal trong
        // class_exists để KHÔNG ép autoload class đã xóa.
        if (class_exists('App\Modules\Integration\ChannelManager')) {
            $this->callAfterResolving(ChannelManager::class, function (ChannelManager $manager) {
                $manager->extend('zalo_personal', fn () => app(ZaloChannelDriver::class));
            });
        }
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

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
        $path = __DIR__.'/../../routes/api.php';
        if (file_exists($path)) {
            Route::middleware('api')->prefix('api')->group($path);
        }
    }

    private function loadSettingsRoutes(): void
    {
        Route::middleware(['web', 'auth', 'workspace'])
            ->prefix('settings')
            ->name('settings.zalo.')
            ->group(function () {
                Route::controller(ZaloConnectionController::class)
                    ->prefix('zalo-connections')
                    ->group(function () {
                        Route::get('/', 'index')->name('index');
                        Route::post('/', 'store')->name('store');
                        Route::get('/qr-status', 'qr')->name('qr');
                        Route::post('/promote', 'promote')->name('promote');
                        Route::delete('/{zaloConnection}', 'destroy')->name('destroy');
                    });
            });
    }
}
