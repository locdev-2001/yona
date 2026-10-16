<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\AgentNotice;
use App\Agent\ValueObjects\AutoReplyStop;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\DeliveryReceipt;
use App\Agent\ValueObjects\Handover;

// Mọi ghi vào hội thoại của lõi, đứng tên AI agent. Từ chối nghiệp vụ trả trong
// DeliveryReceipt, không ném ngoại lệ. Chữ cố định (ghi chú hệ thống) do phía lõi dựng
// theo ngôn ngữ của account; ghi chú không nhắc tên ai.
interface ConversationActionWriter
{
    // Tin công khai cho khách; chỉ AI trả lời của inbox, khi công tắc còn bật.
    public function sendReply(ConversationRef $conversation, int $aiAgentId, string $text): DeliveryReceipt;

    // Ghi chú riêng cố định cho nhân viên (lượt lỗi, cửa sổ kênh đóng, hết ngân sách).
    public function postNotice(ConversationRef $conversation, int $aiAgentId, AgentNotice $notice): DeliveryReceipt;

    // Ghi chú bàn giao + tắt tự động (AI chuyển cho người); giữ nguyên người phụ trách.
    public function handOver(ConversationRef $conversation, int $aiAgentId, Handover $handover): DeliveryReceipt;

    public function disableAutoResponder(ConversationRef $conversation, int $aiAgentId, AutoReplyStop $reason): void;
}
