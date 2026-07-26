<?php

namespace App\Modules\Chat\Adapter\Native;

use App\Modules\Chat\Adapter\Native\Intake\NativeInboundParser;
use App\Modules\Integration\ChannelManager;
use Illuminate\Support\ServiceProvider;

/**
 * Đăng ký kênh nội bộ.
 *
 * KHÔNG có cổng config bật/tắt như các phích cắm bên ngoài: kênh nội bộ là đế,
 * tắt nó đi là làm chat chết — đúng thứ ta vừa bỏ công loại bỏ.
 */
class NativeServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(NativeInboundParser::class, fn () => new NativeInboundParser);

        $this->callAfterResolving(ChannelManager::class, function (ChannelManager $manager) {
            $manager->extend(NativeChannelDriver::KEY, fn () => app(NativeChannelDriver::class));
        });
    }
}
