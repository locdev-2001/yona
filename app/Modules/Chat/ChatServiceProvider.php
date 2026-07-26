<?php

namespace App\Modules\Chat;

use App\Modules\Chat\Port\ChannelRegistry;
use Illuminate\Support\ServiceProvider;

/**
 * Chức năng nhắn tin — lõi tự sống được, phích cắm bên ngoài cắm vào qua Port/.
 *
 * Provider này thay dần IntegrationServiceProvider theo từng cụm di dời của P3.
 * Nó KHÔNG gate qua config: chat là chức năng lõi, không tắt được. Chỉ adapter
 * bên ngoài (ZaloPersonal) mới có cổng bật/tắt của riêng nó.
 */
class ChatServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->registerCompatAliases();

        // Sổ đăng ký kênh sống ở đây chứ không ở provider của phích cắm nào: nó
        // phải tồn tại kể cả khi không có phích cắm ngoài nào được bật.
        $this->app->singleton(ChannelRegistry::class, fn ($app) => new ChannelRegistry($app));
    }

    /**
     * Trỏ FQCN cũ sang FQCN mới, giải quyết LÚC CẦN chứ không lúc boot.
     *
     * Gọi `class_alias` thẳng ở đây sẽ nạp toàn bộ class trong bảng mỗi request.
     * Móc vào autoloader thì tên cũ chỉ được dựng khi có thứ thật sự hỏi tới —
     * thực tế là lúc worker unserialize một job cũ.
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
