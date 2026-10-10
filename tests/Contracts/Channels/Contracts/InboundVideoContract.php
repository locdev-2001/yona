<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.1 inbound_video — video khách gửi thành đính kèm `video` của đúng tin đó. */
final class InboundVideoContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundVideo;
    }

    public function assert(ChannelHarness $harness): void
    {
        $message = $harness->receiveInbound(self::capability())->fresh(['attachments']);

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($message->inbox_id)->toBe($harness->inbox()->id)
            ->and($message->attachments)->toHaveCount(1)
            ->and($message->attachments->first()->fileTypeName())->toBeIn(['video']);
    }
}
