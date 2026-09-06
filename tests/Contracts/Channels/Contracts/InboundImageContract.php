<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.1 inbound_image — ảnh đến phải thành attachment `image` của ĐÚNG tin đó, không tách tin. */
final class InboundImageContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundImage;
    }

    public function assert(ChannelHarness $harness): void
    {
        $message = $harness->receiveInbound(self::capability());

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($message->inbox_id)->toBe($harness->inbox()->id)
            ->and($message->attachments)->not->toBeEmpty()
            ->and($message->attachments->first()->fileTypeName())->toBe('image');
    }
}
