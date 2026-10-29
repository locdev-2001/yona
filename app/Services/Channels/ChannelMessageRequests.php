<?php

namespace App\Services\Channels;

use App\Models\Conversation;

/**
 * Kênh có thư mục "tin nhắn chờ" riêng phía nền tảng: khi chủ hộp thư chấp nhận một hội
 * thoại đang chờ trong Yona, nền tảng cũng phải được báo để chuyển cuộc trò chuyện ra
 * khỏi thư mục đó. Lõi chỉ gọi qua contract này (ChannelActionRegistry::messageRequestsFor);
 * thêm kênh = thêm driver + một dòng đăng ký.
 */
interface ChannelMessageRequests
{
    /** Best-effort: hỏng phía nền tảng không được làm hỏng thao tác của người dùng. */
    public function accept(Conversation $conversation): void;
}
