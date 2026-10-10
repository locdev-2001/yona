<?php

namespace App\Messaging\Inbound;

use App\Models\Message;

/** Chiều của một tin kênh báo về: khách gửi, tenant gửi từ app nền tảng (dội lại), hay chỉ là hoạt động. */
enum InboundDirection: string
{
    case Incoming = 'incoming';

    /** Tenant trả lời thẳng trên app của kênh: ghi là tin đi đã giao, không gửi ngược ra ngoài. */
    case Echo = 'echo';

    case Activity = 'activity';

    public function messageType(): int
    {
        return match ($this) {
            self::Incoming => Message::TYPE_INCOMING,
            self::Echo => Message::TYPE_OUTGOING,
            self::Activity => Message::TYPE_ACTIVITY,
        };
    }

    public function status(): int
    {
        return $this === self::Echo ? Message::STATUSES['delivered'] : Message::STATUSES['sent'];
    }
}
