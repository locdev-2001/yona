<?php

namespace App\Channels;

use App\Models\ContactInbox;

/**
 * Kênh chỉ cho gửi tới khách trong một khoảng sau tin khách nhắn tới (năng lực
 * messaging_window). Cách tính cửa sổ là luật của nền tảng nên nằm trong driver; lõi chỉ
 * hỏi cửa sổ của địa chỉ khách đó còn mở không.
 */
interface LimitsMessagingWindow
{
    public function messagingWindowOpen(ContactInbox $contactInbox): bool;
}
