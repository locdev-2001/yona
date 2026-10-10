<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.1 inbound_file — tệp khách gửi là MỘT đính kèm của đúng tin đó; loại suy theo nội dung, tải hỏng thì fallback vẫn giữ dấu vết. */
final class InboundFileContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundFile;
    }

    public function assert(ChannelHarness $harness): void
    {
        $message = $harness->receiveInbound(self::capability())->fresh(['attachments']);

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($message->inbox_id)->toBe($harness->inbox()->id)
            ->and($message->attachments)->toHaveCount(1)
            ->and($message->attachments->first()->fileTypeName())->toBeIn(['file', 'image', 'video', 'audio', 'fallback']);
    }
}
