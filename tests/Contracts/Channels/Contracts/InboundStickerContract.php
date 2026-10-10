<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Messaging\Stickers\StickerMessage;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * inbound_sticker — sticker của mọi kênh về cùng một hình dạng (App\Messaging\Stickers\StickerMessage):
 * content_type sticker, content rỗng, payload có id, đúng một đính kèm ảnh.
 */
final class InboundStickerContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundSticker;
    }

    public function assert(ChannelHarness $harness): void
    {
        $message = $harness->receiveInbound(self::capability())->fresh(['attachments']);

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and(StickerMessage::isSticker($message))->toBeTrue()
            ->and($message->content)->toBeNull()
            ->and($message->content_attributes['sticker']['id'] ?? null)->not->toBeEmpty()
            ->and($message->attachments)->toHaveCount(1)
            ->and($message->attachments->first()->fileTypeName())->toBe('image');
    }
}
