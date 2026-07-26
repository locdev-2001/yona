<?php

namespace App\Modules\Chat\Port\Capability;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Collection;

/**
 * Kênh nhận được báo "đã xem" từ phía ta.
 *
 * Nhận `Collection<Message>` chứ KHÔNG nhận mảng metadata nền tảng: lõi chỉ
 * quyết định TIN NÀO cần báo (chiều, thu hồi, watermark), driver tự bóc ruột
 * kênh của mình. Đây là cách giữ luật "lõi không đọc key bên trong platform_meta".
 */
interface SupportsSeenReceipts
{
    /**
     * @param  Collection<int, Message>  $messages
     * @return bool true nếu thực sự có gửi đi
     */
    public function sendSeen(Conversation $conversation, Collection $messages): bool;
}
