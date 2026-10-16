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

    /**
     * Gửi nguyên thẻ của shop cho các sản phẩm (id từ ProductCatalog), gộp thành một tin.
     *
     * @param  list<string>  $productIds
     */
    public function sendProductCards(ConversationRef $conversation, int $aiAgentId, array $productIds, ?string $caption): DeliveryReceipt;

    /**
     * Câu hỏi kèm các lựa chọn ngắn khách bấm để trả lời.
     *
     * @param  list<string>  $options
     */
    public function sendQuickReplies(ConversationRef $conversation, int $aiAgentId, string $question, array $options): DeliveryReceipt;

    // Thẻ chuyển khoản (mã QR) tới tài khoản nhận tiền shop mở cho AI; nội dung chuyển
    // khoản theo mẫu của tài khoản đó.
    public function sendPaymentRequest(ConversationRef $conversation, int $aiAgentId, int $amount, ?string $caption): DeliveryReceipt;

    // Ghi chú riêng AI viết cho nhân viên (tóm tắt đơn, việc cần làm).
    public function addNote(ConversationRef $conversation, int $aiAgentId, string $text): DeliveryReceipt;

    /**
     * Gắn thêm nhãn đã có của account vào hội thoại; trả các nhãn hội thoại đang mang,
     * null khi hội thoại không tồn tại.
     *
     * @param  list<string>  $labels
     * @return list<string>|null
     */
    public function addLabels(ConversationRef $conversation, array $labels): ?array;

    // Ghi chú riêng cố định cho nhân viên (lượt lỗi, cửa sổ kênh đóng, hết ngân sách).
    public function postNotice(ConversationRef $conversation, int $aiAgentId, AgentNotice $notice): DeliveryReceipt;

    // Ghi chú bàn giao + tắt tự động (AI chuyển cho người); giữ nguyên người phụ trách.
    public function handOver(ConversationRef $conversation, int $aiAgentId, Handover $handover): DeliveryReceipt;

    public function disableAutoResponder(ConversationRef $conversation, int $aiAgentId, AutoReplyStop $reason): void;
}
