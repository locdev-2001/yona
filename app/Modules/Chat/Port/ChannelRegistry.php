<?php

namespace App\Modules\Chat\Port;

use Illuminate\Support\Manager;
use InvalidArgumentException;

/**
 * Driver-manager cho inbox channels (Zalo, Messenger, TikTok, ...).
 *
 * Channel driver (Integration/Chat/*, ...) đăng ký qua:
 *   app(ChannelRegistry::class)->extend('zalo_personal', fn() => new ZaloChannelDriver(...))
 *
 * Inbox core gọi driver() — KHÔNG import class driver cụ thể (N1 cô lập).
 * Tắt driver → hasAny() = false → inbox empty state (N2).
 */
class ChannelRegistry extends Manager
{
    /**
     * Trả về ChannelDriver theo key kênh.
     *
     * @throws InvalidArgumentException nếu driver chưa đăng ký
     */
    public function driver(mixed $driver = null): ChannelDriver
    {
        /** @var ChannelDriver */
        return parent::driver($driver);
    }

    /**
     * Kiểm tra có ít nhất 1 driver được đăng ký hay chưa.
     * Dùng để hiển thị empty state khi tất cả channel driver tắt.
     */
    public function hasAny(): bool
    {
        return ! empty($this->customCreators);
    }

    /**
     * Mọi driver đã đăng ký, theo key.
     *
     * Dựng instance cho TẤT CẢ key nên kéo theo toàn bộ dependency chain —
     * đừng gọi trong middleware chạy mọi request.
     *
     * @return array<string, ChannelDriver>
     */
    public function all(): array
    {
        $drivers = [];
        foreach (array_keys($this->customCreators) as $key) {
            $drivers[$key] = $this->driver($key);
        }

        return $drivers;
    }

    /**
     * Lọc driver theo diện tương tác chúng hỗ trợ.
     *
     * Thay cho việc lõi hardcode `driver('zalo_personal')` khi cần "kênh nào
     * làm được việc X" — đó chính là literal tên kênh mà grep gate không bắt
     * được vì nó là chuỗi, không phải tên class.
     *
     * @param  class-string  $capability
     * @return array<string, ChannelDriver>
     */
    public function supporting(string $capability): array
    {
        return array_filter($this->all(), fn (ChannelDriver $driver) => $driver instanceof $capability);
    }

    /**
     * Lớp cha đòi một driver mặc định — trả '' để báo "không có mặc định".
     * Caller nên gọi driver('zalo_personal') tường minh.
     */
    public function getDefaultDriver(): string
    {
        return '';
    }
}
