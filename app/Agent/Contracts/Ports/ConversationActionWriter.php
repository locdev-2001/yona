<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\DeliveryReceipt;

// Mọi ghi vào hội thoại của lõi, đứng tên AI agent. Từ chối nghiệp vụ trả trong
// DeliveryReceipt, không ném ngoại lệ.
interface ConversationActionWriter
{
    public function sendReply(ConversationRef $conversation, int $aiAgentId, string $text): DeliveryReceipt;

    /** @param list<int> $mentionUserIds nhân viên người được nhắc trong ghi chú */
    public function postPrivateNote(ConversationRef $conversation, int $aiAgentId, string $text, array $mentionUserIds = []): DeliveryReceipt;

    /**
     * Ghi chú bàn giao + tắt tự động (lý do: AI chuyển cho người); gán người phụ trách
     * khi có $assigneeUserId, không thì giữ nguyên.
     *
     * @param  list<int>  $mentionUserIds
     */
    public function handoff(ConversationRef $conversation, int $aiAgentId, string $note, array $mentionUserIds = [], ?int $assigneeUserId = null): DeliveryReceipt;

    // Tắt tự động khi AI agent tự dừng (công tắc dừng, hết ngân sách).
    public function disableAutoResponder(ConversationRef $conversation, int $aiAgentId): void;
}
