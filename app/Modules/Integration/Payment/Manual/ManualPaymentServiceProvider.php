<?php

namespace App\Modules\Integration\Payment\Manual;

use App\Modules\Integration\PaymentManager;
use Illuminate\Support\ServiceProvider;

/**
 * Service provider cho manual payment driver (sống trong Integration module).
 *
 * Đăng ký driver 'manual' vào PaymentManager singleton qua callAfterResolving.
 *
 * Re-home: được IntegrationServiceProvider register (KHÔNG còn module framework auto-discovery).
 * Internal-first: xóa app/Modules/Integration/ → provider + driver biến mất cùng nhau.
 *
 * Bài học từ ChannelManager: closure extend PHẢI dùng app() helper,
 * KHÔNG dùng $this->app trong closure (binding context khác nhau).
 *
 * @see \App\Modules\Integration\PaymentManager
 * @see \App\Modules\Integration\IntegrationServiceProvider
 */
class ManualPaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->callAfterResolving(PaymentManager::class, function (PaymentManager $manager) {
            $manager->extend('manual', fn () => app(ManualPaymentDriver::class));
        });
    }
}
