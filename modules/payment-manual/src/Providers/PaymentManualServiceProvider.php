<?php

namespace Modules\PaymentManual\Providers;

use Illuminate\Support\ServiceProvider;
use App\Modules\Integration\PaymentManager;
use Modules\PaymentManual\Services\ManualPaymentProvider;

/**
 * Service provider cho payment-manual driver module.
 *
 * Đăng ký driver 'manual' vào PaymentManager singleton của billing.
 * Dùng callAfterResolving để đảm bảo PaymentManager đã được tạo trước khi extend.
 *
 * Bài học từ ChannelManager: closure extend PHẢI dùng app() helper,
 * KHÔNG dùng $this->app trong closure (binding context khác nhau).
 */
class PaymentManualServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->callAfterResolving(PaymentManager::class, function (PaymentManager $manager) {
            $manager->extend('manual', fn () => app(ManualPaymentProvider::class));
        });
    }
}
