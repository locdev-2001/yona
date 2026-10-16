<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\Contracts\Ports\UnitOfWork;
use App\Agent\ValueObjects\AgentNotice;
use App\Agent\ValueObjects\AutoReplyStop;
use App\Agent\ValueObjects\ConversationRef;
use Psr\Log\LoggerInterface;

// Bảng ánh xạ DUY NHẤT từ lý do sang đường lui; thành phần khác chỉ trả lý do.
//   LoopCap, TurnFailed, ModelRefused, TextOnly → ghi chú riêng + chuyển thủ công (lượt lỗi)
//   WindowClosed → ghi chú riêng, tối đa một lần mỗi ngày (DailyNotice)
// Ghi chú không nhắc tên ai.
final class Dispositions
{
    public function __construct(
        private readonly ConversationActionWriter $writer,
        private readonly UnitOfWork $unitOfWork,
        private readonly DailyNotice $dailyNotice,
        private readonly LoggerInterface $logger,
    ) {}

    public function fallBack(FallbackReason $reason, Turn $turn): TurnEnd
    {
        $context = $turn->context;
        $conversation = $context->conversation;
        $aiAgentId = $context->aiAgentId;

        $turn->fellBack($reason);
        $this->logger->info('agent.turn.fallback', ['reason' => $reason->value, 'conversation_id' => $conversation->conversationId]);

        match ($reason) {
            FallbackReason::WindowClosed => $this->dailyNotice->post($conversation, $aiAgentId, AgentNotice::WindowClosed, $context->timezone),
            FallbackReason::LoopCap, FallbackReason::TurnFailed, FallbackReason::ModelRefused, FallbackReason::TextOnly => $this->stopAfterFailure($conversation, $aiAgentId),
        };

        return TurnEnd::FellBack;
    }

    public function stopAfterFailure(ConversationRef $conversation, int $aiAgentId): void
    {
        $this->unitOfWork->run(function () use ($conversation, $aiAgentId) {
            $this->writer->postNotice($conversation, $aiAgentId, AgentNotice::TurnFailed);
            $this->writer->disableAutoResponder($conversation, $aiAgentId, AutoReplyStop::TurnFailed);
        });
    }
}
