<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.1 inbound_reply_to — khách trích dẫn một tin: driver chỉ đặt id ngoài, lõi suy
 * ra `in_reply_to` nội bộ nên giao diện chỉ cần đọc một khoá.
 */
final class InboundReplyToContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundReplyTo;
    }

    public function assert(ChannelHarness $harness): void
    {
        $quoted = $harness->receiveInbound(Capability::InboundText);
        $reply = $harness->receiveReply($quoted);

        expect($reply->content_attributes['in_reply_to_external_id'] ?? null)->toBe($quoted->source_id)
            ->and($reply->content_attributes['in_reply_to'] ?? null)->toBe($quoted->id);
    }
}
