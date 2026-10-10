<?php

namespace App\Models\Channel\Concerns;

use App\Models\ContactInbox;
use App\Models\Message;
use Illuminate\Support\Carbon;

/**
 * Cửa sổ chăm sóc khách 24 giờ của nền tảng Meta (Messenger, Instagram, WhatsApp): gửi tin
 * thường được khi khách nhắn tới địa chỉ đó trong 24 giờ qua, tính trên mọi hội thoại
 * của địa chỉ khách (contact_inbox), không riêng hội thoại đang mở.
 */
trait CustomerServiceWindow
{
    public const MESSAGING_WINDOW_HOURS = 24;

    public function messagingWindowOpen(ContactInbox $contactInbox): bool
    {
        $lastIncomingAt = Message::query()
            ->incoming()
            ->whereIn('conversation_id', $contactInbox->conversations()->select('id'))
            ->max('created_at');

        return $lastIncomingAt !== null
            && now()->lt(Carbon::parse($lastIncomingAt)->addHours(self::MESSAGING_WINDOW_HOURS));
    }
}
