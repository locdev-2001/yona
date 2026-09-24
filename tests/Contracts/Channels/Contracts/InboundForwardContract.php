<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.1 inbound_forward — tin khách chuyển tiếp từ nơi khác mang dấu trung tính
 * `content_attributes.forwarded_from = {origin: 'channel', sender_name?}` và giữ
 * nguyên nội dung được chuyển tiếp.
 */
final class InboundForwardContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundForward;
    }

    public function assert(ChannelHarness $harness): void
    {
        $message = $harness->receiveInbound(self::capability());
        $forwardedFrom = $message->content_attributes['forwarded_from'] ?? null;

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($message->inbox_id)->toBe($harness->inbox()->id)
            ->and($forwardedFrom)->toBeArray()
            ->and($forwardedFrom['origin'] ?? null)->toBe('channel')
            ->and(filled($message->content) || $message->attachments->isNotEmpty())->toBeTrue();
    }
}
