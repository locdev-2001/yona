<?php

namespace Modules\Inbox\Channel;

use Illuminate\Support\Manager;
use InvalidArgumentException;
use Modules\Inbox\Contracts\ChannelDriver;

/**
 * Driver-manager cho inbox channels (Zalo, Messenger, TikTok, ...).
 *
 * Channel driver module (channel-zalo, v.v.) đăng ký qua:
 *   app(ChannelManager::class)->extend('zalo_personal', fn() => new ZaloChannelDriver(...))
 *
 * Inbox core gọi driver() — KHÔNG import class driver cụ thể (N1 cô lập).
 * Tắt channel-zalo → hasAny() = false → inbox empty state (N2).
 */
class ChannelManager extends Manager
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
     * Dùng để hiển thị empty state khi tất cả channel module tắt.
     */
    public function hasAny(): bool
    {
        return ! empty($this->customCreators);
    }

    /**
     * Manager yêu cầu default driver — trả '' để báo "chưa có default".
     * Caller nên gọi driver('zalo_personal') tường minh.
     */
    public function getDefaultDriver(): string
    {
        return '';
    }
}
