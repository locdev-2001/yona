<?php

namespace App\Modules\Payment;

use App\Modules\Payment\Port\PaymentRegistry;
use Illuminate\Support\ServiceProvider;

/**
 * Chức năng thanh toán — cùng khuôn với Chat: `Port/` là cổng, `Adapter/` là phích cắm.
 *
 * Sổ đăng ký luôn tồn tại; từng cổng thanh toán tự bật/tắt trong provider của
 * chính nó qua `config('integrations.*')`. Lõi không biết cổng nào đang bật.
 */
class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->registerCompatAliases();

        $this->app->singleton(PaymentRegistry::class, fn () => new PaymentRegistry);

        $this->app->register(Adapter\Manual\ManualPaymentServiceProvider::class);
    }

    /**
     * Trỏ FQCN cũ sang FQCN mới, giải quyết LÚC CẦN chứ không lúc boot.
     *
     * Mỗi module tự khai bí danh của mình — Chat không phải biết tên class của
     * Payment chỉ để giữ tương thích ngược cho nó.
     */
    private function registerCompatAliases(): void
    {
        $aliases = require __DIR__.'/compat-aliases.php';

        if ($aliases === []) {
            return;
        }

        spl_autoload_register(function (string $requested) use ($aliases): void {
            if (isset($aliases[$requested])) {
                class_alias($aliases[$requested], $requested);
            }
        });
    }
}
