<?php

namespace App\Modules\Integration;

use Illuminate\Support\ServiceProvider;

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
    }
}
