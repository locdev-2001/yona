<?php

namespace App\Services\Admin\Metrics;

use App\Channels\Capability;
use App\Channels\ChannelPlatform;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresPlatform;
use Illuminate\Database\Eloquent\Relations\Relation;

// Hỏi kênh tự khai (nền tảng, năng lực) theo giá trị inboxes.channel_type mà
// không cần nạp từng bản ghi kênh. Kênh mới khai đủ contract là tự có mặt ở đây.
final class ChannelTypes
{
    // Kênh phải đăng nhập/cấp quyền ở một nền tảng bên ngoài mới chạy được.
    private const EXTERNAL_SESSION_CAPABILITIES = [
        Capability::SessionQr,
        Capability::SessionToken,
        Capability::SessionOauth,
    ];

    public function platform(?string $channelType): ChannelPlatform
    {
        $channel = $this->blankChannel($channelType);

        return $channel instanceof DeclaresPlatform ? $channel->platform() : ChannelPlatform::unknown();
    }

    /** @return list<string> */
    public function externallyConnectedTypes(): array
    {
        $types = [];
        foreach (array_keys(Relation::morphMap()) as $type) {
            $channel = $this->blankChannel($type);
            if (! $channel instanceof DeclaresCapabilities) {
                continue;
            }

            $capabilities = $channel->capabilities();
            foreach (self::EXTERNAL_SESSION_CAPABILITIES as $capability) {
                if ($capabilities->has($capability)) {
                    $types[] = $type;
                    break;
                }
            }
        }

        return $types;
    }

    private function blankChannel(?string $channelType): ?object
    {
        $class = $channelType === null ? null : Relation::getMorphedModel($channelType);

        return $class !== null && class_exists($class) ? new $class : null;
    }
}
