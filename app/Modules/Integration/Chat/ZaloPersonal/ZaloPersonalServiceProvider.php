<?php

namespace App\Modules\Integration\Chat\ZaloPersonal;

use App\Modules\Integration\ChannelManager;
use App\Modules\Integration\IntegrationServiceProvider;
use Illuminate\Support\ServiceProvider;

/**
 * Service provider cho Zalo personal channel driver (sống trong Integration module).
 *
 * Đăng ký:
 *   - ZaloSendService (singleton — ZaloHealthMonitor + SendRateLimiter; P11: metering ở OutboundSendPipeline)
 *   - ZaloChannelDriver vào ChannelManager (extend 'zalo_personal')
 *
 * Routes + middleware alias 'zalo.bridge.secret' nay sống ở Laravel routing chuẩn:
 *   - Webhook: routes/api.php (đăng ký qua bootstrap/app.php withRouting api:)
 *   - Connection CRUD: routes/web.php (integrations.zalo.*)
 *   - Alias: bootstrap/app.php withMiddleware $middleware->alias([...])
 *
 * Re-home: được IntegrationServiceProvider register (KHÔNG còn module framework auto-discovery).
 * Internal-first: xóa app/Modules/Integration/ → provider + driver biến mất cùng nhau.
 *
 * Migrations KHÔNG load ở đây — đã chuyển sang database/migrations/ (Laravel thuần).
 *
 * @see ChannelManager
 * @see IntegrationServiceProvider
 */
class ZaloPersonalServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Driver gate: tắt qua config('integrations.zalo_personal.enabled') → driver/route không register.
        if (! config('integrations.zalo_personal.enabled')) {
            return;
        }

        // Singleton services — stateless giữa request; ZaloHealthMonitor + SendRateLimiter dùng Cache.
        $this->app->singleton(ZaloHealthMonitor::class, fn () => new ZaloHealthMonitor);
        $this->app->singleton(SendRateLimiter::class, fn () => new SendRateLimiter);

        $this->app->singleton(ZaloSendService::class, function ($app) {
            return new ZaloSendService(
                rateLimiter: $app->make(SendRateLimiter::class),
                healthMonitor: $app->make(ZaloHealthMonitor::class),
            );
        });

        // Driver nhận qua constructor thay vì gọi app() trong thân method —
        // cần đăng ký tường minh vì driver bị Manager cache suốt đời process.
        $this->app->singleton(ZaloInteractionService::class, fn () => new ZaloInteractionService);

        // Đăng ký ZaloChannelDriver vào ChannelManager singleton.
        // Internal-first: ChannelManager sống cùng module Integration → luôn tồn tại khi provider này chạy.
        // Dùng app() helper trong closure (KHÔNG $this->app — binding context khác).
        $this->callAfterResolving(ChannelManager::class, function (ChannelManager $manager) {
            $manager->extend('zalo_personal', fn () => app(ZaloChannelDriver::class));
        });
    }
}
