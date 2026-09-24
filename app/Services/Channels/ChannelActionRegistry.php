<?php

namespace App\Services\Channels;

use App\Models\Inbox;
use App\Services\Channels\Stickers\StickerCatalog;
use App\Services\Zalo\ZaloGroupMembers;
use App\Services\Zalo\ZaloOutboundActions;
use App\Services\Zalo\ZaloStickerCatalog;

/**
 * Sổ tra driver cho các hành động ngoài "gửi tin" — cùng khuôn với
 * SendReplyJob::CHANNEL_SERVICES: thêm kênh mới = thêm MỘT dòng, lõi không đổi.
 */
class ChannelActionRegistry
{
    /** @var array<string, class-string<ChannelOutboundActions>> */
    private const DRIVERS = [
        'Channel::Zalo' => ZaloOutboundActions::class,
    ];

    /** @var array<string, class-string<ChannelGroupMembers>> */
    private const GROUP_MEMBER_DRIVERS = [
        'Channel::Zalo' => ZaloGroupMembers::class,
    ];

    /** @var array<string, class-string<StickerCatalog>> */
    private const STICKER_CATALOGS = [
        'Channel::Zalo' => ZaloStickerCatalog::class,
    ];

    public static function for(Inbox $inbox): ?ChannelOutboundActions
    {
        $driver = self::DRIVERS[$inbox->channel_type] ?? null;

        return $driver === null ? null : app($driver);
    }

    public static function groupMembersFor(Inbox $inbox): ?ChannelGroupMembers
    {
        $driver = self::GROUP_MEMBER_DRIVERS[$inbox->channel_type] ?? null;

        return $driver === null ? null : app($driver);
    }

    public static function stickers(Inbox $inbox): ?StickerCatalog
    {
        $driver = self::STICKER_CATALOGS[$inbox->channel_type] ?? null;

        return $driver === null ? null : app($driver);
    }
}
