<?php

namespace App\Providers;

use App\Services\ProductEvents\ProductEventHooks;
use App\Services\ProductEvents\ProductEventRecorder;
use Illuminate\Support\ServiceProvider;

// Theo dõi sự kiện sản phẩm (bảng product_events): một recorder dùng chung, hook
// vòng đời model đăng ký một lần. Sự kiện từ tin nhắn đi qua ProductEventListener.
class ProductEventServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ProductEventRecorder::class);
        $this->app->singleton(ProductEventHooks::class);
    }

    public function boot(): void
    {
        $this->app->make(ProductEventHooks::class)->register();
    }
}
