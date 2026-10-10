<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Attachment;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.1 inbound_contact_card — danh thiếp là đính kèm `contact` có `fallback_title`
 * (số điện thoại hoặc tên), chi tiết ở `meta`. Kênh có thẻ riêng (Zalo) vẫn giữ
 * thẻ ở content_attributes cho bong bóng của nó, nhưng đính kèm chuẩn phải có.
 */
final class InboundContactCardContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundContactCard;
    }

    public function assert(ChannelHarness $harness): void
    {
        $message = $harness->receiveInbound(self::capability())->fresh(['attachments']);
        $card = $message->attachments->firstWhere('file_type', Attachment::FILE_TYPE_CONTACT);

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($card)->not->toBeNull()
            ->and($card->fallback_title)->not->toBeEmpty();
    }
}
