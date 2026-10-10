<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.1 inbound_audio — âm thanh/tin thoại thành đính kèm `audio` của đúng tin đó. */
final class InboundAudioContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundAudio;
    }

    public function assert(ChannelHarness $harness): void
    {
        $message = $harness->receiveInbound(self::capability())->fresh(['attachments']);

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($message->inbox_id)->toBe($harness->inbox()->id)
            ->and($message->attachments)->toHaveCount(1)
            ->and($message->attachments->first()->fileTypeName())->toBeIn(['audio']);
    }
}
