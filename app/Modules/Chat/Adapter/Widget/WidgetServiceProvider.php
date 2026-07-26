<?php

namespace App\Modules\Chat\Adapter\Widget;

use App\Modules\Chat\Adapter\Widget\Intake\WidgetInboundParser;
use App\Modules\Chat\Port\ChannelRegistry;
use Illuminate\Support\ServiceProvider;

/**
 * Đăng ký kênh nội bộ.
 *
 * KHÔNG có cổng config bật/tắt như các phích cắm bên ngoài: kênh nội bộ là đế,
 * tắt nó đi là làm chat chết — đúng thứ ta vừa bỏ công loại bỏ.
 */
class WidgetServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(WidgetInboundParser::class, fn () => new WidgetInboundParser);

        $this->callAfterResolving(ChannelRegistry::class, function (ChannelRegistry $registry) {
            $registry->declare(WidgetChannelDriver::descriptorOf());
            $registry->extend(WidgetChannelDriver::KEY, fn () => app(WidgetChannelDriver::class));
        });
    }
}
