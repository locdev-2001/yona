<?php

namespace Tests\Contracts\Channels;

use Tests\Contracts\Channels\Contracts\ChannelContract;
use Tests\Contracts\Channels\Contracts\ConversationOutboundResumeContract;
use Tests\Contracts\Channels\Contracts\EventDeliveredContract;
use Tests\Contracts\Channels\Contracts\EventReactionContract;
use Tests\Contracts\Channels\Contracts\EventRecallContract;
use Tests\Contracts\Channels\Contracts\EventSeenContract;
use Tests\Contracts\Channels\Contracts\InboundAudioContract;
use Tests\Contracts\Channels\Contracts\InboundContactCardContract;
use Tests\Contracts\Channels\Contracts\InboundFileContract;
use Tests\Contracts\Channels\Contracts\InboundForwardContract;
use Tests\Contracts\Channels\Contracts\InboundImageContract;
use Tests\Contracts\Channels\Contracts\InboundLocationContract;
use Tests\Contracts\Channels\Contracts\InboundReplyToContract;
use Tests\Contracts\Channels\Contracts\InboundStickerContract;
use Tests\Contracts\Channels\Contracts\InboundVideoContract;
use Tests\Contracts\Channels\Contracts\MentionContract;
use Tests\Contracts\Channels\Contracts\OutboundAttachmentsContract;
use Tests\Contracts\Channels\Contracts\OutboundStickerContract;
use Tests\Contracts\Channels\Contracts\ReplyToContract;
use Tests\Contracts\Channels\Contracts\SingleConversationContract;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * Chạy đúng những contract mà kênh ĐÃ KHAI BÁO: khai thì phải qua, không khai thì
 * bỏ qua (docs/channel-capabilities.md §1.3–1.4). Đây là chỗ nối duy nhất giữa
 * khai báo năng lực và test — thêm contract chỉ sửa mảng dưới đây.
 *
 * @var list<class-string<ChannelContract>>
 */
final class ChannelContractRunner
{
    public const CONTRACTS = [
        InboundImageContract::class,
        InboundStickerContract::class,
        InboundFileContract::class,
        InboundVideoContract::class,
        InboundAudioContract::class,
        InboundLocationContract::class,
        InboundContactCardContract::class,
        InboundReplyToContract::class,
        InboundForwardContract::class,
        OutboundAttachmentsContract::class,
        ReplyToContract::class,
        MentionContract::class,
        OutboundStickerContract::class,
        EventDeliveredContract::class,
        EventSeenContract::class,
        EventReactionContract::class,
        EventRecallContract::class,
        SingleConversationContract::class,
        ConversationOutboundResumeContract::class,
    ];

    /** @return list<string> tên các contract đã chạy, để test khẳng định không chạy rỗng. */
    public static function runDeclared(ChannelHarness $harness): array
    {
        $inbox = $harness->inbox();
        $executed = [];

        foreach (self::CONTRACTS as $contract) {
            if (! $inbox->supports($contract::capability())) {
                continue;
            }

            (new $contract)->assert($harness);
            $executed[] = $contract::capability()->value;
        }

        return $executed;
    }
}
