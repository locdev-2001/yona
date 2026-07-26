<?php

namespace App\Modules\Integration;

use App\Modules\Chat\Adapter\ZaloPersonal\ZaloPersonalServiceProvider;
use App\Modules\Integration\Payment\Manual\ManualPaymentServiceProvider;
use Illuminate\Support\ServiceProvider;

/**
 * Integration module — registry cho channel/payment drivers (internal-first).
 *
 * Đăng ký CÓ ĐIỀU KIỆN từ AppServiceProvider::register() qua class_exists check.
 * Xóa cả thư mục app/Modules/Integration/ → provider biến mất → inbox/billing core
 * vẫn build/chạy (chỉ mất gửi-ngoài). KHÔNG add vào bootstrap/providers.php
 * (hard-reference sẽ fatal khi xóa).
 *
 * Sổ đăng ký kênh đã chuyển sang ChatServiceProvider (cụm 1) — phần còn lại ở
 * đây teo dần theo từng cụm và biến mất hẳn ở cụm 7.
 */
class IntegrationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PaymentManager::class, fn () => new PaymentManager);

        // Re-home driver providers INTO Integration — không còn module-framework auto-discovery.
        // Internal-first: xóa app/Modules/Integration/ → các provider + driver + routes biến mất cùng nhau.
        $this->app->register(ZaloPersonalServiceProvider::class);
        $this->app->register(ManualPaymentServiceProvider::class);
    }
}
