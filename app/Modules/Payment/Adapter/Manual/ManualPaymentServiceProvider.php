<?php

namespace App\Modules\Payment\Adapter\Manual;

use App\Modules\Payment\Port\PaymentRegistry;
use Illuminate\Support\ServiceProvider;

/**
 * Service provider cho manual payment driver.
 *
 * Đăng ký driver 'manual' vào PaymentRegistry singleton qua callAfterResolving.
 *
 * Khai báo thẳng ở bootstrap/providers.php; tự tắt bên trong qua config.
 *
 * Bài học từ ChannelRegistry: closure extend PHẢI dùng app() helper,
 * KHÔNG dùng $this->app trong closure (binding context khác nhau).
 *
 * @see PaymentRegistry
 */
class ManualPaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Driver gate: tắt qua config('integrations.payment_manual.enabled') → driver không register.
        if (! config('integrations.payment_manual.enabled')) {
            return;
        }

        $this->callAfterResolving(PaymentRegistry::class, function (PaymentRegistry $manager) {
            $manager->extend('manual', fn () => app(ManualPaymentDriver::class));
        });
    }
}
