<?php

namespace App\Modules\Integration;

use Illuminate\Support\ServiceProvider;
use App\Modules\Integration\PaymentManager;

/**
 * Integration module — registry cho channel/payment drivers (internal-first).
 *
 * Đăng ký CÓ ĐIỀU KIỆN từ AppServiceProvider::register() qua class_exists check.
 * Xóa cả thư mục app/Modules/Integration/ → provider biến mất → inbox/billing core
 * vẫn build/chạy (chỉ mất gửi-ngoài). KHÔNG add vào bootstrap/providers.php
 * (hard-reference sẽ fatal khi xóa).
 *
 * ChannelManager: singleton driver registry. Driver (Chat/ZaloPersonal/, ...)
 * đăng ký qua extend() trong service provider riêng của driver.
 */
class IntegrationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ChannelManager::class, function ($app) {
            return new ChannelManager($app);
        });

        $this->app->singleton(PaymentManager::class, fn () => new PaymentManager());

        // Re-home driver providers INTO Integration — không còn module-framework auto-discovery.
        // Internal-first: xóa app/Modules/Integration/ → các provider + driver + routes biến mất cùng nhau.
        $this->app->register(\App\Modules\Integration\Chat\ZaloPersonal\ZaloPersonalServiceProvider::class);
        $this->app->register(\App\Modules\Integration\Payment\Manual\ManualPaymentServiceProvider::class);
    }
}
