<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use App\Services\Messages\InReplyToMessageBuilder;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.2 outbound_reply_to — agent trích dẫn bằng id NỘI BỘ; driver phải tự đổi sang
 * id ngoài của tin gốc khi gửi. Lõi không biết kênh gọi khoá đó là gì.
 */
final class ReplyToContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::OutboundReplyTo;
    }

    public function assert(ChannelHarness $harness): void
    {
        $quoted = $harness->receiveInbound(Capability::InboundText);
        expect($quoted->source_id)->not->toBeNull();

        $conversation = $quoted->conversation;
        $reply = $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'trả lời trích dẫn',
        ]);

        (new InReplyToMessageBuilder($reply, $quoted->id, null))->perform();
        $reply->save();

        expect($reply->content_attributes['in_reply_to'])->toBe($quoted->id)
            ->and($harness->sendOutbound($this->readyToSend($reply))->flattened())->toContain($quoted->source_id);
    }
}
