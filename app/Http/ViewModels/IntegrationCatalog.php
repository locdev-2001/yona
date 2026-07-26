<?php

namespace App\Http\ViewModels;

use App\Models\ChannelAccount;
use App\Modules\Chat\Port\ChannelDescriptor;
use App\Modules\Chat\Port\ChannelRegistry;
use Illuminate\Support\Facades\Route;

/**
 * Danh mục tích hợp cho trang `/integrations`.
 *
 * Đây là một MÀN HÌNH, không phải nơi code tích hợp trú: nó hỏi sổ đăng ký "có
 * phích cắm nào, đã kết nối chưa" rồi vẽ ra. Thêm một kênh là card tự hiện,
 * không sửa file này.
 */
class IntegrationCatalog
{
    public function __construct(private readonly ChannelRegistry $channels) {}

    /**
     * @return list<array{key: string, name: string, category: string, logo: string, enabled: bool, connected: bool, href: string|null}>
     */
    public function cards(): array
    {
        $connectedChannels = ChannelAccount::query()
            ->where('status', 'connected')
            ->distinct()
            ->pluck('channel')
            ->all();

        return array_values(array_map(
            fn (ChannelDescriptor $descriptor) => [
                'key' => $descriptor->key,
                'name' => $descriptor->label,
                'category' => $descriptor->category,
                'logo' => $descriptor->logo,
                'enabled' => $this->enabled($descriptor->key),
                // Chặt hơn bản cũ (`ZaloConnection::exists()`): một phiên đã hỏng
                // vẫn để lại hàng kết nối, nhưng nó KHÔNG còn nhận được tin.
                'connected' => in_array($descriptor->key, $connectedChannels, true),
                // Dựng URL là việc của tầng biên vào; kênh không có trang kết
                // nối riêng thì trả null và giao diện ẩn nút.
                'href' => $this->connectUrl($descriptor),
            ],
            $this->channels->descriptors(),
        ));
    }

    /**
     * Route của phích cắm ngoài chỉ được đăng ký khi kênh đó đang bật — hỏi
     * router trước, đừng gọi `route()` rồi bắt ngoại lệ.
     */
    private function connectUrl(ChannelDescriptor $descriptor): ?string
    {
        if ($descriptor->connectRouteName === null || ! Route::has($descriptor->connectRouteName)) {
            return null;
        }

        return route($descriptor->connectRouteName);
    }

    /**
     * Kênh không khai cổng config nào thì luôn bật — đó là kênh nội bộ, tắt nó
     * đi là làm chat chết.
     */
    private function enabled(string $key): bool
    {
        return (bool) config("integrations.{$key}.enabled", true);
    }
}
