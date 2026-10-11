<?php

namespace App\Models\Channel\Concerns;

use App\Models\ContactInbox;
use App\Models\Message;
use Illuminate\Support\Carbon;

/**
 * Cửa sổ chăm sóc khách của nền tảng Meta: gửi tin được khi khách nhắn tới địa chỉ đó
 * trong khoảng giờ của kênh, tính trên mọi hội thoại của địa chỉ khách (contact_inbox),
 * không riêng hội thoại đang mở. Mặc định 24 giờ; kênh có tag nhân viên hỗ trợ ghi đè.
 */
trait CustomerServiceWindow
{
    public function messagingWindowHours(): int
    {
        return 24;
    }

    public function messagingWindowOpen(ContactInbox $contactInbox): bool
    {
        $lastIncomingAt = Message::query()
            ->incoming()
            ->whereIn('conversation_id', $contactInbox->conversations()->select('id'))
            ->max('created_at');

        return $lastIncomingAt !== null
            && now()->lt(Carbon::parse($lastIncomingAt)->addHours($this->messagingWindowHours()));
    }
}
