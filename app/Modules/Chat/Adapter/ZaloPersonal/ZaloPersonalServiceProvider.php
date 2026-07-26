<?php

namespace App\Modules\Chat\Adapter\ZaloPersonal;

use App\Modules\Chat\Adapter\ZaloPersonal\Delivery\ZaloInteractionService;
use App\Modules\Chat\Adapter\ZaloPersonal\Delivery\ZaloSendService;
use App\Modules\Chat\Adapter\ZaloPersonal\Health\ZaloHealthMonitor;
use App\Modules\Chat\Adapter\ZaloPersonal\Policy\SendRateLimiter;
use App\Modules\Chat\Port\ChannelRegistry;
use Illuminate\Support\ServiceProvider;

/**
 * Service provider cho Zalo personal channel driver.
 *
 * Đăng ký:
 *   - ZaloSendService (singleton — ZaloHealthMonitor + SendRateLimiter; P11: metering ở DeliveryPipeline)
 *   - ZaloChannelDriver vào ChannelRegistry (extend 'zalo_personal')
 *
 * Routes + middleware alias 'zalo.bridge.secret' nay sống ở Laravel routing chuẩn:
 *   - Webhook: routes/api.php (đăng ký qua bootstrap/app.php withRouting api:)
 *   - Connection CRUD: routes/web.php (integrations.zalo.*)
 *   - Alias: bootstrap/app.php withMiddleware $middleware->alias([...])
 *
 * Khai báo thẳng ở bootstrap/providers.php; tự tắt bên trong qua config.
 *
 * Migrations KHÔNG load ở đây — đã chuyển sang database/migrations/ (Laravel thuần).
 *
 * @see ChannelRegistry
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
        // cần đăng ký tường minh vì sổ đăng ký giữ driver suốt đời process.
        $this->app->singleton(ZaloInteractionService::class, fn () => new ZaloInteractionService);

        // Đăng ký ZaloChannelDriver vào ChannelRegistry singleton.
        // Internal-first: ChannelRegistry sống cùng module Integration → luôn tồn tại khi provider này chạy.
        // Dùng app() helper trong closure (KHÔNG $this->app — binding context khác).
        $this->callAfterResolving(ChannelRegistry::class, function (ChannelRegistry $manager) {
            $manager->extend('zalo_personal', fn () => app(ZaloChannelDriver::class));
        });
    }
}
